# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AHC-VDSL (AtCoder Heuristic Contest - Visualization Domain-Specific Language) is a DSL for creating custom visualizers for heuristic programming contests. Solution code outputs `$v`-prefixed commands to stderr, which are parsed and rendered as animations in a web-based visualizer.

**Live visualizer:** https://hiro116s.github.io/ahc-vdsl/

## Build Commands

### Rust Library
```bash
cd rust
cargo build --features vis       # Build with visualization
cargo build --no-default-features # Build without visualization (production)
cargo test --features vis        # Run tests
```

### C++ Library
```bash
cd cpp
make test          # Run all tests
make test-enabled  # Test with ENABLE_VIS
make test-disabled # Test without ENABLE_VIS (zero-cost)
make clean         # Clean build artifacts
```

### Visualizer
```bash
cd visualizer
npm install        # Setup
npm run dev        # Development server (http://localhost:8080)
npm run build      # Production build (output: dist/)
npm run watch      # Watch mode
```

## Architecture

```
Solution Code (Rust/C++) → Library API → DSL Output ($v commands)
                                              ↓
                          parser.ts → renderer.ts → SVG in Browser
```

### Key Components

- **rust/src/ahc_vdsl.rs** - Rust library with `#[cfg(feature = "vis")]` for zero-cost disabled mode
- **cpp/ahc_vdsl.hpp** - Header-only C++ library with `#ifdef ENABLE_VIS`
- **visualizer/src/parser.ts** - DSL protocol parser
- **visualizer/src/renderer.ts** - SVG rendering logic
- **SPECIFICATIONS.md** - Full DSL protocol specification

### Feature Flags

Both libraries use conditional compilation to completely eliminate visualization code in production:
- Rust: `vis` feature (enabled by default)
- C++: `ENABLE_VIS` preprocessor macro

## Command Modification/Addition Tasks

When modifying or adding DSL commands (indicated by `[コマンド変更]` or `[コマンド追加]` in issues), you must update:
1. Visualizer (TypeScript parser and renderer)
2. Rust library
3. C++ library
4. Test cases for both libraries
5. Documentation: README.md, SPECIFICATIONS.md, rust/README.md, cpp/README.md

## DSL Protocol

Commands are prefixed with `$v` (default mode) or `$v(mode_name)` for specific modes. Main command types:
- `CANVAS` - Canvas size
- `COMMIT` - Frame boundary
- `GRID` - Grid rendering with cells, colors, text, lines, walls
- `2D_PLANE` - Vector graphics (circles, lines, polygons)
- `TEXTAREA` - Information panels
- `BAR_GRAPH` - Numerical visualization
- `SCORE` - Score display

## Testing

- **Rust:** Tests in `rust/src/ahc_vdsl_tests.rs`
- **C++:** Two test suites - `ahc_vdsl_test.cpp` (enabled) and `ahc_vdsl_test_disabled.cpp` (disabled mode)
- **Visualizer:** Sample files in `visualizer/samples/` serve as integration tests
