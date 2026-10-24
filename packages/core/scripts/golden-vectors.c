/*
 * Golden-vector driver for @luovi/core/math. Built and run by generate-golden-vectors.sh, which
 * documents the whole procedure; this file holds the sampling, the oracle calls and the writers.
 *
 * Usage: golden-vectors <out-dir> <compile-flags> [<c-file> <sha256>]...
 *
 * Every input comes from integer arithmetic on a splitmix64 stream plus the plain double
 * operations of `uniform`, which this file is compiled to evaluate without contraction, so a
 * re-run on any IEEE host writes byte-identical files. Adding a function is one row in
 * `functions` (and its C files in the script); a row never shifts another row's inputs because
 * each row seeds its own stream from the FNV-1a hash of its name.
 */

#include <float.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* The FDLIBM entry points, renamed by the script's -D flags so the host libm never answers. */
double fdlibm_sin(double);
double fdlibm_cos(double);
double fdlibm_tan(double);
double fdlibm_atan(double);
double fdlibm_scalbn(double, int);
double __ieee754_asin(double);
double __ieee754_acos(double);
double __ieee754_atan2(double, double);
int __ieee754_rem_pio2(double, double *);
double fdlibm_expm1(double);
double fdlibm_log1p(double);
double fdlibm_tanh(double);
double fdlibm_cbrt(double);
double __ieee754_exp(double);
double __ieee754_log(double);
double __ieee754_log10(double);
double __ieee754_pow(double, double);
double __ieee754_sinh(double);
double __ieee754_cosh(double);
double __ieee754_atanh(double);
double __ieee754_hypot(double, double);
double __ieee754_remainder(double, double);

/* ---- deterministic sampling ---- */

static uint64_t rng_state;

static uint64_t next_u64(void) {
  uint64_t z = (rng_state += 0x9E3779B97F4A7C15ull);
  z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ull;
  z = (z ^ (z >> 27)) * 0x94D049BB133111EBull;
  return z ^ (z >> 31);
}

static uint64_t fnv1a64(const char *s) {
  uint64_t h = 0xCBF29CE484222325ull;
  for (; *s; s++) {
    h ^= (unsigned char)*s;
    h *= 0x100000001B3ull;
  }
  return h;
}

static double from_bits(uint64_t b) {
  double d;
  memcpy(&d, &b, sizeof d);
  return d;
}

static uint64_t to_bits(double d) {
  uint64_t b;
  memcpy(&b, &d, sizeof b);
  return b;
}

static double uniform(double a, double b) {
  double u = (double)(next_u64() >> 11) * 0x1p-53;
  return a + (b - a) * u;
}

static long long uniform_int(long long lo, long long hi) { /* inclusive */
  return lo + (long long)(next_u64() % (uint64_t)(hi - lo + 1));
}

/* 2^e * 1.m with e uniform in [p, q) and 52 random mantissa bits, assembled as bits; below the
 * normal range the significand is shifted into a subnormal, truncating. */
static double log_uniform(int p, int q, int both_signs) {
  int e = (int)uniform_int(p, q - 1);
  uint64_t mant = next_u64() >> 12;
  uint64_t sign = both_signs ? (next_u64() >> 63) << 63 : 0;
  uint64_t bits;
  if (e >= -1022) {
    bits = ((uint64_t)(e + 1023) << 52) | mant;
  } else {
    bits = ((1ull << 52) | mant) >> (-1022 - e);
  }
  return from_bits(sign | bits);
}

/* ---- domains ---- */

enum dist { UNIFORM, LOG_UNIFORM, LOG_UNIFORM_BOTH, INTEGER, CONSTANT, ONE_MINUS_LOG_UNIFORM_BOTH, POWINT_BASE };

struct side {
  enum dist dist;
  double a, b; /* bounds; powers of two (as exponents) for the log-uniform kinds; a alone for CONSTANT */
};

struct domain {
  int count;
  struct side s[2]; /* s[1] is used by two-input functions only */
};

static double draw(const struct side *s) {
  switch (s->dist) {
  case UNIFORM:
    return uniform(s->a, s->b);
  case LOG_UNIFORM:
    return log_uniform((int)s->a, (int)s->b, 0);
  case LOG_UNIFORM_BOTH:
    return log_uniform((int)s->a, (int)s->b, 1);
  case INTEGER:
    return (double)uniform_int((long long)s->a, (long long)s->b);
  case CONSTANT:
    return s->a;
  case ONE_MINUS_LOG_UNIFORM_BOTH: {
    double d = log_uniform((int)s->a, (int)s->b, 0);
    double v = 1.0 - d; /* one uncontracted rounding, so deterministic */
    return (next_u64() >> 63) ? -v : v;
  }
  case POWINT_BASE:
    break; /* drawn by powint_base, which needs the exponent */
  }
  return 0;
}

/* powInt's base for exponent n (section 2.5 of the step 1 surfaces): x = +-m * 2^e with m odd in
 * [1, 2^20) and e in [-60, 60], restricted so the benchmark's exact BigInt result is what
 * left-to-right squaring must produce: m^|n| < 2^53 makes every partial product exact, and
 * |x|^|n| in [2^-1022, 2^1024) keeps every partial product a normal double, so the only rounding
 * is the final 1 / r of a negative n. m < 2^floor(53/|n|) gives the first; e is drawn from the
 * range that gives the second with room for the 53-bit m^|n|. */
static double powint_base(int n) {
  int a = n < 0 ? -n : n;
  int bits = a == 0 ? 20 : 53 / a;
  if (bits > 20) bits = 20;
  long long m = bits == 0 ? 1 : 2 * uniform_int(0, (1ll << (bits - 1)) - 1) + 1;
  int lo = -60, hi = 60;
  if (a > 0) {
    int elo = -(1022 / a); /* ceil(-1022 / a) */
    int ehi = (1024 - 53) / a;
    if (elo > lo) lo = elo;
    if (ehi < hi) hi = ehi;
  }
  int e = (int)uniform_int(lo, hi);
  double x = (double)m * from_bits((uint64_t)(e + 1023) << 52);
  return (next_u64() >> 63) ? -x : x;
}

static void describe_side(char *buf, size_t n, const struct side *s) {
  switch (s->dist) {
  case UNIFORM:
    snprintf(buf, n, "uniform [%.17g, %.17g]", s->a, s->b);
    break;
  case LOG_UNIFORM:
    snprintf(buf, n, "log-uniform [2^%d, 2^%d]", (int)s->a, (int)s->b);
    break;
  case LOG_UNIFORM_BOTH:
    snprintf(buf, n, "log-uniform magnitude [2^%d, 2^%d], both signs", (int)s->a, (int)s->b);
    break;
  case INTEGER:
    snprintf(buf, n, "integer [%.17g, %.17g]", s->a, s->b);
    break;
  case CONSTANT:
    snprintf(buf, n, "constant %.17g", s->a);
    break;
  case ONE_MINUS_LOG_UNIFORM_BOTH:
    snprintf(buf, n, "1 - log-uniform [2^%d, 2^%d], both signs", (int)s->a, (int)s->b);
    break;
  case POWINT_BASE:
    snprintf(buf, n, "+-m * 2^e, m odd in [1, 2^20), e in [-60, 60], m^|n| < 2^53, |x|^|n| in [2^-1022, 2^1024)");
    break;
  }
}

/* ---- edge cases ---- */

#define NAN_BITS 0x7FF8000000000000ull
#define MAX_EDGES 256

/* Common to every function: signed zero, the subnormal and normal boundaries, small integers,
 * huge and overflowing magnitudes, infinities and NaN. */
static int common_edges(double *e) {
  const double base[] = {0.0, 0x1p-1074, 0x1p-1022 - 0x1p-1074, 0x1p-1022, 0.5, 1.0, 2.0, 1e300, DBL_MAX, 1.0 / 0.0};
  int n = 0;
  for (size_t i = 0; i < sizeof base / sizeof base[0]; i++) {
    e[n++] = base[i];
    e[n++] = -base[i];
  }
  e[n++] = from_bits(NAN_BITS);
  return n;
}

/* The reduced list each side of a two-input function crosses with the other. */
static int reduced_edges(double *e) {
  const double base[] = {0.0, 0x1p-1074, 1.0, 2.0, DBL_MAX, 1.0 / 0.0};
  int n = 0;
  for (size_t i = 0; i < sizeof base / sizeof base[0]; i++) {
    e[n++] = base[i];
    e[n++] = -base[i];
  }
  e[n++] = from_bits(NAN_BITS);
  return n;
}

static const double PIO2 = 1.5707963267948966; /* 0x3FF921FB 0x54442D18 */

/* Argument-reduction boundaries: multiples of pi/2 as doubles, the end of the medium path, a
 * huge power of ten, and 6381956970095103 * 2^797, the closest double to a multiple of pi/2. */
static int trig_edges(double *e) {
  const double base[] = {PIO2 * 0.5, PIO2, PIO2 * 2, PIO2 * 4, 0x1p19 * PIO2, 1e22, 6381956970095103.0 * 0x1p797};
  int n = 0;
  for (size_t i = 0; i < sizeof base / sizeof base[0]; i++) {
    e[n++] = base[i];
    e[n++] = -base[i];
  }
  return n;
}

/* The branch thresholds of e_asin.c and e_acos.c. */
static int inverse_trig_edges(double *e) {
  const double base[] = {0x1p-27, 0x1p-57, 0.975, 1.0 - 0x1p-53, 1.0 + 0x1p-52};
  int n = 0;
  for (size_t i = 0; i < sizeof base / sizeof base[0]; i++) {
    e[n++] = base[i];
    e[n++] = -base[i];
  }
  return n;
}

/* The interval boundaries of s_atan.c. */
static int atan_edges(double *e) {
  const double base[] = {0x1p-29, 0.4375, 0.6875, 1.1875, 2.4375, 0x1p66};
  int n = 0;
  for (size_t i = 0; i < sizeof base / sizeof base[0]; i++) {
    e[n++] = base[i];
    e[n++] = -base[i];
  }
  return n;
}

static int signed_edges(double *e, const double *base, size_t count) {
  int n = 0;
  for (size_t i = 0; i < count; i++) {
    e[n++] = base[i];
    e[n++] = -base[i];
  }
  return n;
}

#define SIGNED_EDGES(e, ...)                                                                                         \
  do {                                                                                                               \
    const double base_[] = {__VA_ARGS__};                                                                            \
    return signed_edges(e, base_, sizeof base_ / sizeof base_[0]);                                                   \
  } while (0)

static const double LN2 = 0.69314718055994529; /* 0x3FE62E42 0xFEFA39EF */

/* The overflow and underflow thresholds of e_exp.c (o_threshold, u_threshold and their
 * neighbours) and the reduction boundaries at 0.5 ln2 and 1.5 ln2. */
static int exp_edges(double *e) {
  SIGNED_EDGES(e, from_bits(0x40862E42FEFA39EFull), from_bits(0x40862E42FEFA39F0ull), 709.782712893384,
               from_bits(0x40874910D52D3051ull), from_bits(0x40874910D52D3052ull), 745.1332191019411, LN2 * 0.5,
               LN2 * 1.5, 0x1p-28, 0x1p-29);
}

/* e_exp.c's set plus s_expm1.c's 56 ln2 saturation and 2^-54 cut. */
static int expm1_edges(double *e) {
  SIGNED_EDGES(e, from_bits(0x40862E42FEFA39EFull), from_bits(0x40862E42FEFA39F0ull), LN2 * 56, LN2 * 0.5,
               LN2 * 1.5, 0x1p-54, 0x1p-55, 40.0);
}

/* Around 1, where log's |f| < 2^-20 path runs, a subnormal with a long mantissa and decades. */
static int log_edges(double *e) {
  const double base[] = {1.0 + 0x1p-52, 1.0 - 0x1p-53, 1.0 + 0x1p-20, 1.0 - 0x1p-21, 3 * 0x1p-1074, 1e-310,
                         0.1, 10.0, 100.0, 1000.0, 1e22, 1.5, 0.75};
  int n = 0;
  for (size_t i = 0; i < sizeof base / sizeof base[0]; i++) e[n++] = base[i];
  return n;
}

/* The branch boundaries of s_log1p.c and -1 from either side. */
static int log1p_edges(double *e) {
  const double base[] = {1.0 + 0x1p-52, 0x1p-52, 0x1p-29, 0x1p-30, 0x1p-54, 0x1p-55, 0.41422, -0.41422, 0.2929, -0.2929,
                         -1.0 + 0x1p-53, -1.0 - 0x1p-52, 0x1p53, 1e-310, -1e-310};
  int n = 0;
  for (size_t i = 0; i < sizeof base / sizeof base[0]; i++) e[n++] = base[i];
  return n;
}

/* The 22 and log(DBL_MAX) boundaries, the overflow threshold of e_sinh.c and e_cosh.c (and its
 * neighbour), and the tiny cuts. */
static int hyperbolic_edges(double *e) {
  SIGNED_EDGES(e, 22.0, from_bits(0x4036000000000000ull - 1), from_bits(0x40862E42FEFA39EFull),
               from_bits(0x408633CE8FB9F87Dull), from_bits(0x408633CE8FB9F87Eull), 0x1p-28, 0x1p-55, LN2 * 0.5, 710.0);
}

/* +-1 from either side, the 0.5 split and the 2^-28 cut of e_atanh.c. */
static int atanh_edges(double *e) {
  SIGNED_EDGES(e, 1.0 + 0x1p-52, 1.0 - 0x1p-53, 0.5, 0.5 - 0x1p-54, 0x1p-28, 0x1p-29);
}

/* Perfect cubes, a subnormal with a long mantissa, and the subnormal path's scale. */
static int cbrt_edges(double *e) {
  SIGNED_EDGES(e, 8.0, 27.0, 1e-310, 3 * 0x1p-1074, 0.001, 1e300 * 10);
}

/* The C99 Annex F pairs and the branches of e_pow.c: x**y pairs, y after x. */
static int pow_pairs(double *e) {
  const double inf = 1.0 / 0.0, nan = from_bits(NAN_BITS);
  const double pairs[][2] = {
      {0.0, 3.0},       {-0.0, 3.0},       {0.0, 2.0},       {-0.0, 2.0},     {0.0, 0.5},           {-0.0, 0.5},
      {0.0, -3.0},      {-0.0, -3.0},      {0.0, -2.0},      {-0.0, -2.0},    {0.0, -0.5},          {-0.0, -0.5},
      {0.0, inf},       {-0.0, -inf},      {inf, 0.5},       {inf, -0.5},     {-inf, 3.0},          {-inf, 2.0},
      {-inf, -3.0},     {-inf, -2.0},      {-inf, 0.5},      {-1.0, inf},     {-1.0, -inf},         {1.0, nan},
      {nan, 0.0},       {nan, -0.0},       {2.0, 1024.0},    {2.0, -1075.0},  {2.0, 1023.9999},     {2.0, -1074.5},
      {-8.0, 1.0 / 3},  {-2.0, 3.0},       {-2.0, 0.5},      {-2.0, 0x1p53},  {-2.0, 0x1p53 + 2},   {-2.0, 0x1p52 + 1},
      {-3.0, 0x1p21 + 1}, {0.5, 0.5},      {4.0, 0.5},       {3.0, -1.0},     {3.0, 1.0},           {3.0, 2.0},
      {1.0 - 0x1p-53, 0x1p62}, {1.0 + 0x1p-52, -0x1p62}, {1.0 + 0x1p-52, 0x1p65}, {0.9, 0x1p65}, {10.0, 308.25},
      {1e-310, 0.5},    {1e-310, 1.5},     {DBL_MAX, 0.5},   {0x1p-1074, -0.5}, {1.5, 1750.0},       {0.5, 1074.5},
  };
  int n = 0;
  for (size_t i = 0; i < sizeof pairs / sizeof pairs[0]; i++) {
    e[n++] = pairs[i][0];
    e[n++] = pairs[i][1];
  }
  return (int)(sizeof pairs / sizeof pairs[0]);
}

/* NaN against an infinity in either order (the infinity wins), exact triples and the scaling
 * boundaries of e_hypot.c. */
static int hypot_pairs(double *e) {
  const double inf = 1.0 / 0.0, nan = from_bits(NAN_BITS);
  const double pairs[][2] = {
      {inf, nan},     {nan, inf},      {-inf, nan},    {nan, -inf},     {3.0, 4.0},       {-5.0, 12.0},
      {1e308, 1e308}, {0x1p-1074, 0x1p-1074}, {1e-310, 1e-300}, {1.0, 0x1p-61}, {1.0, 0x1p-60}, {0x1p500, 0x1p500},
      {0x1p-500, 0x1p-500}, {0x1p501, 1.0},  {0x1p-501, 0x1p-560},
  };
  int n = 0;
  for (size_t i = 0; i < sizeof pairs / sizeof pairs[0]; i++) {
    e[n++] = pairs[i][0];
    e[n++] = pairs[i][1];
  }
  return (int)(sizeof pairs / sizeof pairs[0]);
}

/* A zero divisor, infinite and NaN operands, the ties of round-to-even, the large-p path of
 * e_remainder.c (p > DBL_MAX/2), subnormals and the wave-phase use. */
static int remainder_pairs(double *e) {
  const double inf = 1.0 / 0.0, nan = from_bits(NAN_BITS);
  const double pairs[][2] = {
      {5.0, 0.0},      {5.0, -0.0},       {inf, 2.0},       {-inf, 2.0},       {5.0, inf},          {5.0, -inf},
      {5.0, 2.0},      {7.0, 2.0},        {-5.0, 2.0},      {-7.0, 2.0},       {6.0, 4.0},          {2.0, 4.0},
      {-0.0, 1.0},     {0.0, 1.0},        {3.0, nan},       {nan, 3.0},        {1e300, 0x1p-1074},  {5 * 0x1p-1074, 2 * 0x1p-1074},
      {DBL_MAX, 1e-300}, {1.0, DBL_MAX},  {DBL_MAX, DBL_MAX * 0.75}, {0x1p1023 * 1.5, 0x1p1023}, {1e6, 6.2831853071795862},
      {1e15, 6.2831853071795862}, {-1e15, 6.2831853071795862}, {3 * 0x1p-1022, 0x1p-1022}, {0x1p-1022, 3 * 0x1p-1074},
  };
  int n = 0;
  for (size_t i = 0; i < sizeof pairs / sizeof pairs[0]; i++) {
    e[n++] = pairs[i][0];
    e[n++] = pairs[i][1];
  }
  return (int)(sizeof pairs / sizeof pairs[0]);
}

/* powInt's fixed special list: zero, infinite and NaN bases against zero, odd, even and int32
 * extreme exponents, unit bases with huge exponents, and exact powers of two that reach the ends
 * of the double range (2^1024 overflows, 2^-1075 rounds to zero). */
static int powint_pairs(double *e) {
  const double inf = 1.0 / 0.0, nan = from_bits(NAN_BITS);
  const double bases[] = {0.0, -0.0, inf, -inf, nan, 1.0, -1.0};
  const double ns[] = {0, 1, -1, 2, -2, 3, -3, 64, -63, 2147483647.0, -2147483648.0};
  const double pairs[][2] = {
      {2.0, 1023.0}, {2.0, 1024.0}, {-2.0, 1023.0}, {2.0, -1022.0}, {2.0, -1023.0}, {-2.0, -1023.0},
      {0.5, 1074.0}, {0.5, 1075.0}, {0.5, -1023.0}, {0.5, -1024.0}, {3.0, 33.0},    {-3.0, -33.0},
  };
  int n = 0;
  for (size_t i = 0; i < sizeof bases / sizeof bases[0]; i++)
    for (size_t j = 0; j < sizeof ns / sizeof ns[0]; j++) {
      e[n++] = bases[i];
      e[n++] = ns[j];
    }
  for (size_t i = 0; i < sizeof pairs / sizeof pairs[0]; i++) {
    e[n++] = pairs[i][0];
    e[n++] = pairs[i][1];
  }
  return n / 2;
}

/* powInt as @luovi/core/math specifies it: |n|'s bits from the most significant down, squaring
 * then multiplying by x for each set bit, and one division for a negative n. This file is compiled
 * without contraction, so every product rounds on its own as in JavaScript. Its records are the
 * ones whose partial products round, where any other order of squaring gives other bits; the
 * powInt row keeps the exact inputs and the benchmark's BigInt oracle. */
static double powint_left_to_right(double x, double nd) {
  int n = (int)nd;
  uint32_t m = n < 0 ? 0u - (uint32_t)n : (uint32_t)n;
  double r = 1.0;
  for (int bit = m == 0 ? -1 : 31 - __builtin_clz(m); bit >= 0; bit--) {
    r *= r;
    if ((m >> bit) & 1u) r *= x;
  }
  return n < 0 ? 1.0 / r : r;
}

static int no_edges(double *e) {
  (void)e;
  return 0;
}

/* ---- functions ---- */

enum kind { UNARY, BINARY, SCALBN, SINCOS, REM_PIO2, POWINT, POWINT_ROUNDED };

struct function {
  const char *name;
  enum kind kind;
  double (*unary)(double);
  double (*binary)(double, double);
  /* Unary kinds: extra edge inputs, returning how many. The two-input kinds: extra (a, b) pairs
   * written back to back, returning how many pairs. */
  int (*extra_edges)(double *);
  struct domain domains[5];
};

static double atan2_yx(double y, double x) { return __ieee754_atan2(y, x); }

#define TRIG_DOMAINS                                                                                                 \
  {{1536, {{UNIFORM, -10, 10}}}, {1536, {{UNIFORM, -1e6, 1e6}}}, {1024, {{LOG_UNIFORM_BOTH, 20, 1023}}}}

/* sin, cos and sincos add a dense [-pi/4, pi/4] domain, the kernel-only range the simulation uses
 * most. It comes last so the earlier domains keep drawing exactly the inputs they did before. */
#define KERNEL_TRIG_DOMAINS                                                                                          \
  {{1536, {{UNIFORM, -10, 10}}},                                                                                     \
   {1536, {{UNIFORM, -1e6, 1e6}}},                                                                                   \
   {1024, {{LOG_UNIFORM_BOTH, 20, 1023}}},                                                                           \
   {2048, {{UNIFORM, -PIO2 * 0.5, PIO2 * 0.5}}}}

#define HYPERBOLIC_DOMAINS {{1536, {{UNIFORM, -20, 20}}}, {1536, {{UNIFORM, -1, 1}}}, {1024, {{UNIFORM, -710, 710}}}}

#define LOG_DOMAINS {{2048, {{LOG_UNIFORM, -1000, 1000}}}, {2048, {{UNIFORM, 0.5, 2}}}}

static double pow_xy(double x, double y) { return __ieee754_pow(x, y); }
static double hypot_xy(double x, double y) { return __ieee754_hypot(x, y); }
static double remainder_xy(double x, double y) { return __ieee754_remainder(x, y); }

/* Sorted by name, which is the manifest's order. Counts per row sum to 4096 sampled records, plus
 * the dense [-pi/4, pi/4] domain of sin, cos, sincos and tan. */
static const struct function functions[] = {
    {"acos", UNARY, __ieee754_acos, NULL, inverse_trig_edges,
     {{3072, {{UNIFORM, -1, 1}}}, {1024, {{LOG_UNIFORM_BOTH, -60, -1}}}}},
    {"asin", UNARY, __ieee754_asin, NULL, inverse_trig_edges,
     {{3072, {{UNIFORM, -1, 1}}}, {1024, {{LOG_UNIFORM_BOTH, -60, -1}}}}},
    {"atan", UNARY, fdlibm_atan, NULL, atan_edges,
     {{2048, {{UNIFORM, -10, 10}}}, {2048, {{LOG_UNIFORM_BOTH, -60, 60}}}}},
    {"atan2", BINARY, NULL, atan2_yx, no_edges,
     {{3072, {{UNIFORM, -100, 100}, {UNIFORM, -100, 100}}},
      {1024, {{LOG_UNIFORM_BOTH, -60, 60}, {LOG_UNIFORM_BOTH, -60, 60}}}}},
    {"atanh", UNARY, __ieee754_atanh, NULL, atanh_edges,
     {{2048, {{UNIFORM, -1, 1}}},
      {1024, {{ONE_MINUS_LOG_UNIFORM_BOTH, -53, -1}}},
      {1024, {{LOG_UNIFORM_BOTH, -60, -1}}}}},
    {"cbrt", UNARY, fdlibm_cbrt, NULL, cbrt_edges,
     {{2048, {{UNIFORM, -100, 100}}}, {2048, {{LOG_UNIFORM_BOTH, -1074, 1023}}}}},
    {"cos", UNARY, fdlibm_cos, NULL, trig_edges, KERNEL_TRIG_DOMAINS},
    {"cosh", UNARY, __ieee754_cosh, NULL, hyperbolic_edges, HYPERBOLIC_DOMAINS},
    {"exp", UNARY, __ieee754_exp, NULL, exp_edges,
     {{1536, {{UNIFORM, -700, 700}}},
      {1536, {{UNIFORM, -1, 1}}},
      {512, {{UNIFORM, -746, -700}}},
      {512, {{UNIFORM, 700, 710}}}}},
    {"expm1", UNARY, fdlibm_expm1, NULL, expm1_edges,
     {{1536, {{UNIFORM, -1, 1}}}, {1536, {{UNIFORM, -40, 710}}}, {1024, {{LOG_UNIFORM_BOTH, -60, -1}}}}},
    {"hypot", BINARY, NULL, hypot_xy, hypot_pairs,
     {{3072, {{UNIFORM, -100, 100}, {UNIFORM, -100, 100}}},
      {1024, {{LOG_UNIFORM_BOTH, -1000, 1000}, {LOG_UNIFORM_BOTH, -1000, 1000}}}}},
    {"log", UNARY, __ieee754_log, NULL, log_edges, LOG_DOMAINS},
    {"log10", UNARY, __ieee754_log10, NULL, log_edges, LOG_DOMAINS},
    {"log1p", UNARY, fdlibm_log1p, NULL, log1p_edges,
     {{2048, {{UNIFORM, -1, 1}}}, {2048, {{LOG_UNIFORM, -60, 1000}}}}},
    {"pow", BINARY, NULL, pow_xy, pow_pairs,
     {{2048, {{UNIFORM, 0.01, 100}, {UNIFORM, -50, 50}}},
      {1024, {{UNIFORM, 0.99, 1.01}, {UNIFORM, 0, 8700}}},
      {1024, {{UNIFORM, -100, -0.01}, {INTEGER, -50, 50}}}}},
    {"powInt", POWINT, NULL, NULL, powint_pairs, {{4096, {{POWINT_BASE, 0, 0}, {INTEGER, -64, 64}}}}},
    /* Full 53-bit bases: short chains of rounded products, long chains near one, and chains that
     * overflow or round into the subnormals. */
    {"powIntRounded", POWINT_ROUNDED, NULL, powint_left_to_right, no_edges,
     {{2048, {{LOG_UNIFORM_BOTH, -4, 4}, {INTEGER, -64, 64}}},
      {1024, {{UNIFORM, 0.9, 1.1}, {INTEGER, -1100, 1100}}},
      {1024, {{LOG_UNIFORM_BOTH, -2, 2}, {INTEGER, -1100, 1100}}}}},
    {"rem_pio2", REM_PIO2, NULL, NULL, trig_edges, TRIG_DOMAINS},
    {"remainder", BINARY, NULL, remainder_xy, remainder_pairs,
     {{2048, {{UNIFORM, -1e3, 1e3}, {UNIFORM, 0.1, 10}}},
      {1024, {{UNIFORM, 0, 1e6}, {CONSTANT, 6.2831853071795862, 6.2831853071795862}}},
      {1024, {{LOG_UNIFORM_BOTH, -60, 60}, {LOG_UNIFORM_BOTH, -60, 60}}}}},
    {"scalbn", SCALBN, NULL, NULL, no_edges, {{4096, {{UNIFORM, -10, 10}, {INTEGER, -1100, 1100}}}}},
    {"sin", UNARY, fdlibm_sin, NULL, trig_edges, KERNEL_TRIG_DOMAINS},
    {"sincos", SINCOS, NULL, NULL, trig_edges, KERNEL_TRIG_DOMAINS},
    {"sinh", UNARY, __ieee754_sinh, NULL, hyperbolic_edges, HYPERBOLIC_DOMAINS},
    {"tan", UNARY, fdlibm_tan, NULL, trig_edges,
     {{1024, {{UNIFORM, -1.5, 1.5}}},
      {1024, {{UNIFORM, -10, 10}}},
      {1024, {{UNIFORM, -1e6, 1e6}}},
      {1024, {{LOG_UNIFORM_BOTH, 20, 1023}}},
      {2048, {{UNIFORM, -PIO2 * 0.5, PIO2 * 0.5}}}}},
    {"tanh", UNARY, fdlibm_tanh, NULL, hyperbolic_edges, HYPERBOLIC_DOMAINS},
};

/* Exponents for scalbn's edge records: identities, the exponent range ends, the int32 extremes
 * and the +-50000 guards of s_scalbn.c. */
static const int scalbn_edge_n[] = {0, 1, -1, 1023, -1022, -1074, 2098, -2098, 50001, -50001, 2147483647, -2147483647 - 1};

static int inputs_of(enum kind k) { return (k == BINARY || k == SCALBN || k == POWINT || k == POWINT_ROUNDED) ? 2 : 1; }

/* powInt has no C oracle: its records are inputs only, and the benchmark computes the exact result. */
static int outputs_of(enum kind k) { return k == POWINT ? 0 : k == SINCOS ? 2 : k == REM_PIO2 ? 3 : 1; }

/* ---- writing ---- */

static void put_f64(FILE *f, double d) {
  uint64_t b = to_bits(d);
  unsigned char bytes[8];
  for (int i = 0; i < 8; i++) bytes[i] = (unsigned char)(b >> (8 * i));
  if (fwrite(bytes, 1, 8, f) != 8) {
    perror("fwrite");
    exit(1);
  }
}

static void record(FILE *f, const struct function *fn, double a, double b) {
  double y[2];
  int n;
  switch (fn->kind) {
  case UNARY:
    put_f64(f, a);
    put_f64(f, fn->unary(a));
    break;
  case BINARY:
  case POWINT_ROUNDED:
    put_f64(f, a);
    put_f64(f, b);
    put_f64(f, fn->binary(a, b));
    break;
  case SCALBN:
    put_f64(f, a);
    put_f64(f, b);
    put_f64(f, fdlibm_scalbn(a, (int)b));
    break;
  case SINCOS:
    put_f64(f, a);
    put_f64(f, fdlibm_sin(a));
    put_f64(f, fdlibm_cos(a));
    break;
  case REM_PIO2:
    n = __ieee754_rem_pio2(a, y);
    put_f64(f, a);
    put_f64(f, (double)n);
    put_f64(f, y[0]);
    put_f64(f, y[1]);
    break;
  case POWINT:
    put_f64(f, a);
    put_f64(f, b);
    break;
  }
}

/* Writes one function's file and its manifest entry; returns the record count. */
static void generate(const char *dir, const struct function *fn, FILE *manifest, int last) {
  char path[4096];
  char desc[5][256];
  int ndesc = 0;
  int records = 0;
  snprintf(path, sizeof path, "%s/%s.f64", dir, fn->name);
  FILE *f = fopen(path, "wb");
  if (!f) {
    perror(path);
    exit(1);
  }
  rng_state = fnv1a64(fn->name);

  for (int d = 0; d < 5 && fn->domains[d].count > 0; d++) {
    const struct domain *dom = &fn->domains[d];
    int two = inputs_of(fn->kind) == 2;
    char a[128], b[128];
    describe_side(a, sizeof a, &dom->s[0]);
    if (two) {
      describe_side(b, sizeof b, &dom->s[1]);
      snprintf(desc[ndesc++], sizeof desc[0], "%s x %s x %d", a, b, dom->count);
    } else {
      snprintf(desc[ndesc++], sizeof desc[0], "%s x %d", a, dom->count);
    }
    for (int i = 0; i < dom->count; i++) {
      double x, y;
      if (dom->s[0].dist == POWINT_BASE) {
        /* the base's range depends on the exponent, so the exponent is drawn first */
        y = draw(&dom->s[1]);
        x = powint_base((int)y);
      } else {
        x = draw(&dom->s[0]);
        y = two ? draw(&dom->s[1]) : 0;
      }
      record(f, fn, x, y);
      records++;
    }
  }

  double edges[MAX_EDGES];
  int sampled = records;
  if (fn->kind == BINARY || fn->kind == POWINT || fn->kind == POWINT_ROUNDED) {
    if (fn->kind == BINARY) {
      double red[MAX_EDGES];
      int nr = reduced_edges(red);
      for (int i = 0; i < nr; i++)
        for (int j = 0; j < nr; j++) {
          record(f, fn, red[i], red[j]);
          records++;
        }
    }
    int np = fn->extra_edges(edges);
    for (int i = 0; i < np; i++) {
      record(f, fn, edges[2 * i], edges[2 * i + 1]);
      records++;
    }
  } else {
    int ne = common_edges(edges);
    ne += fn->extra_edges(edges + ne);
    if (fn->kind == SCALBN) {
      int nn = (int)(sizeof scalbn_edge_n / sizeof scalbn_edge_n[0]);
      for (int i = 0; i < ne; i++)
        for (int j = 0; j < nn; j++) {
          record(f, fn, edges[i], (double)scalbn_edge_n[j]);
          records++;
        }
    } else {
      for (int i = 0; i < ne; i++) {
        record(f, fn, edges[i], 0);
        records++;
      }
    }
  }
  fclose(f);

  fprintf(manifest, "    {\n      \"domains\": [\n");
  for (int i = 0; i < ndesc; i++) fprintf(manifest, "        \"%s\",\n", desc[i]);
  fprintf(manifest, "        \"edge cases x %d\"\n      ],\n", records - sampled);
  fprintf(manifest, "      \"file\": \"%s.f64\",\n", fn->name);
  fprintf(manifest, "      \"inputs\": %d,\n", inputs_of(fn->kind));
  fprintf(manifest, "      \"name\": \"%s\",\n", fn->name);
  fprintf(manifest, "      \"outputs\": %d,\n", outputs_of(fn->kind));
  fprintf(manifest, "      \"records\": %d\n    }%s\n", records, last ? "" : ",");
}

int main(int argc, char **argv) {
  if (argc < 3 || (argc - 3) % 2 != 0) {
    fprintf(stderr, "usage: %s <out-dir> <compile-flags> [<c-file> <sha256>]...\n", argv[0]);
    return 2;
  }
  char path[4096];
  snprintf(path, sizeof path, "%s/manifest.json", argv[1]);
  FILE *m = fopen(path, "w");
  if (!m) {
    perror(path);
    return 1;
  }
  fprintf(m, "{\n  \"compile\": \"%s\",\n  \"fdlibm\": {\n    \"files\": {\n", argv[2]);
  for (int i = 3; i < argc; i += 2)
    fprintf(m, "      \"%s\": \"%s\"%s\n", argv[i], argv[i + 1], i + 2 < argc ? "," : "");
  fprintf(m, "    },\n    \"source\": \"https://www.netlib.org/fdlibm/\"\n  },\n  \"functions\": [\n");
  size_t count = sizeof functions / sizeof functions[0];
  for (size_t i = 0; i < count; i++) {
    if (i > 0 && strcmp(functions[i - 1].name, functions[i].name) >= 0) {
      fprintf(stderr, "functions[] must be sorted by name: %s\n", functions[i].name);
      return 1;
    }
    generate(argv[1], &functions[i], m, i + 1 == count);
  }
  fprintf(m, "  ],\n  \"version\": 1\n}\n");
  fclose(m);
  return 0;
}
