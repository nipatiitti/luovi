#!/bin/sh
# Generates the golden vectors in packages/core/golden from netlib FDLIBM 5.3 (ADR 0002).
#
# Run by hand, never in CI:  sh packages/core/scripts/generate-golden-vectors.sh
# Needs: sh, curl, shasum and clang. Writes <name>.f64 and manifest.json into ../golden and
# leaves nothing else behind.
#
# What it does:
#   1. Downloads the FDLIBM files listed in FILES from https://www.netlib.org/fdlibm/ into a
#      fresh temporary directory and checks each against the sha256 pinned below, so the oracle
#      is exactly the published 5.3 source.
#   2. Compiles them with clang $FDLIBM_FLAGS. -ffp-contract=off is the decided oracle flag: no
#      fused multiply-add, which JavaScript cannot do either. -fno-builtin keeps clang from
#      folding calls into its own libm knowledge, -fno-strict-aliasing because FDLIBM type-puns
#      doubles through int pointers, -std=gnu89 because the sources are pre-ANSI style,
#      -D__LITTLE_ENDIAN because fdlibm.h only recognises old x86 macros, and -D_IEEE_LIBM so
#      any wrapper returns the IEEE result. Every public FDLIBM symbol is renamed to fdlibm_<name>
#      so the host libm can never resolve one.
#   3. Compiles golden-vectors.c (the sampler, the oracle calls and the writers) without
#      contraction, links, and runs it. Its header and its `functions` table say how inputs are
#      drawn; the record layouts are the ones engine.golden-vectors reads.
#
# Re-running produces byte-identical files: the sampler is seeded per function from its name and
# uses only integer arithmetic and uncontracted IEEE double operations. The manifest holds no
# timestamp and no compiler version.
#
# To add a function: add its C files (and their pins) to FILES, its public names to RENAMES,
# and one row to `functions` in golden-vectors.c.

set -eu

here=$(cd "$(dirname "$0")" && pwd)
out="$here/../golden"
source_url="https://www.netlib.org/fdlibm"

FILES="e_acos.c e_asin.c e_atan2.c e_atanh.c e_cosh.c e_exp.c e_fmod.c e_hypot.c e_log.c e_log10.c e_pow.c e_rem_pio2.c e_remainder.c e_sinh.c e_sqrt.c fdlibm.h k_cos.c k_rem_pio2.c k_sin.c k_tan.c s_atan.c s_cbrt.c s_copysign.c s_cos.c s_expm1.c s_fabs.c s_floor.c s_log1p.c s_scalbn.c s_sin.c s_tan.c s_tanh.c w_sqrt.c"

PINS="bc9fbb24c214030604c0df4c811370f37d511e0c72580767d8c81bd68b0c3a5a  e_acos.c
4ec96c4c7747df94911404b1577e404e13efc51e104f1934e72b536b61adc911  e_asin.c
61dbf9edc927468280ccde872ecfb7cb1ea7cbaf6e1b28e7021c968abe5f7c6e  e_atan2.c
8588db2d5e1d904454f17dc04a001e7cf528d410e7ffc38ef52e368ef4d1f7ea  e_atanh.c
381b01b9244180a726bc6282125a31c049a9c12b553eaf758df7c674e7b6b816  e_cosh.c
04c96195b7ced914d659b5fd204724c182f091af8631fe42016ad6e27cb302ef  e_exp.c
2657de1a6c8ab69116449769e0c9e7bb4f71dae3233b35be65421cba635f5809  e_fmod.c
87425adcaeabfebcf9f78ba774f4b29d2a158c1f948e2b3129e74b5d6e9cc2ff  e_hypot.c
a2b1bd1b367026a35f36da53425cd618386c3bf69d23ac224a40791aa9855ac9  e_log.c
0d636f23e0e70430344cfb003aebce3317260e28c716bbfb8c0839117e533efc  e_log10.c
763b86baa63eb3518b43f7f3e44e5ed10992b62650f4a45c3a2ea6015e6d5122  e_pow.c
3a08dd4a38f9f9fc9478a33ca05cb81a6566f1010ab14412e97cae091bede16b  e_rem_pio2.c
cded9488f26de10f5faa6acfad4b7fedf2ccd49c1e747f7b57b0f082e5045293  e_remainder.c
9f6a04f80045a5c0a6d134fdb56d89e65e2a862cdc03fef40505194504ab10e8  e_sinh.c
2a6e784d1089eb6351df7e59037de4240d11a5c61967611732f81ad96fe869ce  e_sqrt.c
64113c472c2676499288bc35a821b0867916552930bc52c7445d2c50dddf0e71  fdlibm.h
841086c75288f3f9fef03bae2a9dc24e99c3cdb2035e170c69452013a7b5befc  k_cos.c
5796209ea3fe1af88e22badeaed0f6a6aa923914e097e227c410527cb5815740  k_rem_pio2.c
75d391f3c124806ce14893cd038ae5dd10663e40430ffa174d5fddcb33012167  k_sin.c
9dfd4c84f7930da3184a6c425ce7901979c84088cf231c33a7edefc3e0f487c0  k_tan.c
8583c253aed6318dee2a48135e3f3b1328d838a390372a69414ac41eb5ce5ce1  s_atan.c
7ce1c7299e60b9b998393312b140fa8738d13f11d89b88dd47d5c2df81eadfbb  s_cbrt.c
459c18858c944a4e7062d38ab4dfb596edbe76706d24029c2dac766dcd2be3fd  s_copysign.c
bdcbea3c83b2d4aa521b9a5341f3e58b8cb9c8d326fcc4abb715f3704cf17799  s_cos.c
7b1daee13811866caee47e2f9b9b2deccdde3debd646d14db54b11a7938c9dc7  s_expm1.c
c6389f3e0472ec0157d648b3e4e80b405038acfaf3e85b961363ea483e3259f1  s_fabs.c
fbe8779a58d46879222ba6b390931b13118037c5123b8e89a73cf0231f643b4a  s_floor.c
f72f255a022fad06c3fe222ad90f961ac5624958373a4fbdae9df3f344135373  s_log1p.c
9ad1bb374fc2951ec086474c82373b45bccfdecd34d631974dccf8633f40d99e  s_scalbn.c
4d5edb75368e4f8e0ac18682d3ae4b6944ba06801637cf0df6f378d6211f4c81  s_sin.c
f86caed50cf19150e0be229469785ce937d8d9b37046541408bce146180ba685  s_tan.c
fcf39a7e30393ac4cae5c631c60b4fb4273f4461f3fce3af03713a2b1469f286  s_tanh.c
be9c9416808e510ea08a8d1de3b746b1b7cad1e8b433f5f7ec02b6d00c2c72ed  w_sqrt.c"

RENAMES="sin cos tan atan fabs floor scalbn copysign sqrt expm1 log1p tanh cbrt"

FDLIBM_FLAGS="-O2 -ffp-contract=off -fno-builtin -fno-strict-aliasing -std=gnu89 -D_IEEE_LIBM -D__LITTLE_ENDIAN"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

for f in $FILES; do
  curl -fsSL "$source_url/$f" -o "$work/$f"
done
printf '%s\n' "$PINS" >"$work/pins.sha256"
(cd "$work" && shasum -a 256 -c pins.sha256 >/dev/null)

defines=""
for name in $RENAMES; do
  defines="$defines -D$name=fdlibm_$name"
done

objects=""
for f in $FILES; do
  case $f in
  *.c)
    # shellcheck disable=SC2086 # the flag strings are meant to split
    clang $FDLIBM_FLAGS $defines -w -c "$work/$f" -o "$work/${f%.c}.o"
    objects="$objects $work/${f%.c}.o"
    ;;
  esac
done
clang -O2 -ffp-contract=off -std=c11 -Wall -Wextra -c "$here/golden-vectors.c" -o "$work/golden-vectors.o"
# shellcheck disable=SC2086
clang "$work/golden-vectors.o" $objects -o "$work/golden-vectors"

# Manifest arguments: every pinned C file with its hash, in FILES order.
set --
for f in $FILES; do
  set -- "$@" "$f" "$(printf '%s\n' "$PINS" | awk -v f="$f" '$2 == f { print $1 }')"
done

mkdir -p "$out"
rm -f "$out"/*.f64 "$out/manifest.json"
"$work/golden-vectors" "$out" "$FDLIBM_FLAGS" "$@"
