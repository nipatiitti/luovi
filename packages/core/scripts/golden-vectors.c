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

enum dist { UNIFORM, LOG_UNIFORM, LOG_UNIFORM_BOTH, INTEGER };

struct side {
  enum dist dist;
  double a, b; /* bounds; powers of two (as exponents) for the log-uniform kinds */
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
  }
  return 0;
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
  }
}

/* ---- edge cases ---- */

#define NAN_BITS 0x7FF8000000000000ull
#define MAX_EDGES 64

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

static int no_edges(double *e) {
  (void)e;
  return 0;
}

/* ---- functions ---- */

enum kind { UNARY, BINARY, SCALBN, SINCOS, REM_PIO2 };

struct function {
  const char *name;
  enum kind kind;
  double (*unary)(double);
  double (*binary)(double, double);
  int (*extra_edges)(double *);
  struct domain domains[5];
};

static double atan2_yx(double y, double x) { return __ieee754_atan2(y, x); }

#define TRIG_DOMAINS                                                                                                 \
  {{1536, {{UNIFORM, -10, 10}}}, {1536, {{UNIFORM, -1e6, 1e6}}}, {1024, {{LOG_UNIFORM_BOTH, 20, 1023}}}}

/* Sorted by name, which is the manifest's order. Counts per row sum to 4096 sampled records. */
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
    {"cos", UNARY, fdlibm_cos, NULL, trig_edges, TRIG_DOMAINS},
    {"rem_pio2", REM_PIO2, NULL, NULL, trig_edges, TRIG_DOMAINS},
    {"scalbn", SCALBN, NULL, NULL, no_edges, {{4096, {{UNIFORM, -10, 10}, {INTEGER, -1100, 1100}}}}},
    {"sin", UNARY, fdlibm_sin, NULL, trig_edges, TRIG_DOMAINS},
    {"sincos", SINCOS, NULL, NULL, trig_edges, TRIG_DOMAINS},
    {"tan", UNARY, fdlibm_tan, NULL, trig_edges,
     {{1024, {{UNIFORM, -1.5, 1.5}}},
      {1024, {{UNIFORM, -10, 10}}},
      {1024, {{UNIFORM, -1e6, 1e6}}},
      {1024, {{LOG_UNIFORM_BOTH, 20, 1023}}}}},
};

/* Exponents for scalbn's edge records: identities, the exponent range ends, the int32 extremes
 * and the +-50000 guards of s_scalbn.c. */
static const int scalbn_edge_n[] = {0, 1, -1, 1023, -1022, -1074, 2098, -2098, 50001, -50001, 2147483647, -2147483647 - 1};

static int inputs_of(enum kind k) { return (k == BINARY || k == SCALBN) ? 2 : 1; }

static int outputs_of(enum kind k) { return k == SINCOS ? 2 : k == REM_PIO2 ? 3 : 1; }

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
      double x = draw(&dom->s[0]);
      double y = two ? draw(&dom->s[1]) : 0;
      record(f, fn, x, y);
      records++;
    }
  }

  double edges[MAX_EDGES];
  int sampled = records;
  if (fn->kind == BINARY) {
    double red[MAX_EDGES];
    int nr = reduced_edges(red);
    for (int i = 0; i < nr; i++)
      for (int j = 0; j < nr; j++) {
        record(f, fn, red[i], red[j]);
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
