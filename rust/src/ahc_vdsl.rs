pub mod ahc_vdsl {
    #[cfg(feature = "vis")]
    mod vis_enabled {
        use std::fmt::{Display, Write};
        use std::fs::File;
        use std::io::Write as IoWrite;
        use std::path::PathBuf;

        use rustc_hash::{FxHashMap, FxHashSet};

        pub enum OutputDestination {
            Stderr,
            File(PathBuf),
        }

        pub struct VisRoot {
            fames_by_mode: FxHashMap<String, Vec<VisFrame>>,
            output_destination: OutputDestination,
        }

        impl Default for VisRoot {
            fn default() -> Self {
                Self::new()
            }
        }

        impl VisRoot {
            pub fn new() -> Self {
                Self {
                    fames_by_mode: FxHashMap::default(),
                    output_destination: OutputDestination::Stderr,
                }
            }

            pub fn new_with_file<P: Into<PathBuf>>(path: P) -> Self {
                Self {
                    fames_by_mode: FxHashMap::default(),
                    output_destination: OutputDestination::File(path.into()),
                }
            }

            pub fn add_frame(&mut self, mode: &str, frame: VisFrame) {
                let frames = self.fames_by_mode.entry(mode.to_string()).or_default();
                frames.push(frame);
            }

            pub fn add_frames(&mut self, mode: &str, mut frames: Vec<VisFrame>) {
                let existing_frames = self.fames_by_mode.entry(mode.to_string()).or_default();
                existing_frames.append(&mut frames);
            }

            pub fn get_frames(&self, mode: &str) -> Option<&Vec<VisFrame>> {
                self.fames_by_mode.get(mode)
            }

            pub fn output_all(&self) {
                let mut output = String::new();
                for (mode, frames) in &self.fames_by_mode {
                    for frame in frames.iter() {
                        output.push_str(&frame.to_vis_string(mode));
                    }
                }

                match &self.output_destination {
                    OutputDestination::Stderr => {
                        eprint!("{output}");
                    }
                    OutputDestination::File(path) => {
                        if let Ok(mut file) = File::create(path) {
                            let _ = file.write_all(output.as_bytes());
                        }
                    }
                }
            }
        }

        pub struct VisCanvas {
            h: f64,
            w: f64,
        }

        impl VisCanvas {
            pub fn new(h: f64, w: f64) -> Self {
                Self { h, w }
            }

            pub fn to_vis_string(&self, mode: &str) -> String {
                format!("$v({}) CANVAS {} {}\n", mode, self.h, self.w)
            }
        }

        impl Default for VisCanvas {
            fn default() -> Self {
                Self::new(800.0, 800.0)
            }
        }

        pub struct VisFrame {
            vis_canvas: Option<VisCanvas>,
            vis_grid: Option<VisGrid>,
            vis_2d_plane: Option<Vis2DPlane>,
            score: String,
            textarea: Vec<String>,
            with_debug: bool,
        }

        impl VisFrame {
            pub fn new_grid<T: ToString>(grid: VisGrid, score: T) -> Self {
                Self {
                    vis_canvas: None,
                    vis_grid: Some(grid),
                    vis_2d_plane: None,
                    score: score.to_string(),
                    textarea: Vec::new(),
                    with_debug: false,
                }
            }

            pub fn new_2d_plane<T: ToString>(plane: Vis2DPlane, score: T) -> Self {
                Self {
                    vis_canvas: None,
                    vis_grid: None,
                    vis_2d_plane: Some(plane),
                    score: score.to_string(),
                    textarea: Vec::new(),
                    with_debug: false,
                }
            }

            pub fn set_canvas(&mut self, canvas: VisCanvas) {
                self.vis_canvas = Some(canvas);
            }

            pub fn set_grid(&mut self, grid: VisGrid) {
                assert!(
                    self.vis_2d_plane.is_none(),
                    "Cannot use GRID and 2D_PLANE in the same frame"
                );
                self.vis_grid = Some(grid);
            }

            pub fn set_2d_plane(&mut self, plane: Vis2DPlane) {
                assert!(
                    self.vis_grid.is_none(),
                    "Cannot use GRID and 2D_PLANE in the same frame"
                );
                self.vis_2d_plane = Some(plane);
            }

            pub fn set_score(&mut self, score: String) {
                self.score = score;
            }

            pub fn add_textarea(&mut self, text: String) {
                self.textarea.push(text);
            }

            pub fn enable_debug(&mut self) {
                self.with_debug = true;
            }

            pub fn disable_debug(&mut self) {
                self.with_debug = false;
            }

            pub fn to_vis_string(&self, mode: &str) -> String {
                let mut output = String::new();

                // Output canvas if present
                if let Some(canvas) = &self.vis_canvas {
                    output.push_str(&canvas.to_vis_string(mode));
                }

                // Output grid or 2d_plane
                if let Some(grid) = &self.vis_grid {
                    output.push_str(&grid.to_vis_string(mode));
                } else if let Some(plane) = &self.vis_2d_plane {
                    output.push_str(&plane.to_vis_string(mode));
                }

                // Output score
                if !self.score.is_empty() {
                    writeln!(&mut output, "$v({}) SCORE {}", mode, self.score).unwrap();
                }

                // Output textarea
                for text in &self.textarea {
                    writeln!(&mut output, "$v({mode}) TEXTAREA {text}").unwrap();
                }

                // Output debug flag
                if self.with_debug {
                    writeln!(&mut output, "$v({mode}) DEBUG").unwrap();
                }

                // Commit the frame
                writeln!(&mut output, "$v({mode}) COMMIT").unwrap();

                output
            }
        }

        impl Default for VisFrame {
            fn default() -> Self {
                Self {
                    vis_canvas: None,
                    vis_grid: Some(VisGrid::new(0, 0)),
                    vis_2d_plane: None,
                    score: String::new(),
                    textarea: Vec::new(),
                    with_debug: false,
                }
            }
        }

        pub struct ItemBounds {
            pub min_x: f64,
            pub min_y: f64,
            pub max_x: f64,
            pub max_y: f64,
        }

        impl ItemBounds {
            pub fn new(min_x: f64, min_y: f64, max_x: f64, max_y: f64) -> Self {
                Self {
                    min_x,
                    min_y,
                    max_x,
                    max_y,
                }
            }
        }

        pub struct Vis2DPlane {
            h: f64,
            w: f64,
            circle_groups: Vec<CircleGroup>,
            line_groups: Vec<LineGroup>,
            polygon_groups: Vec<PolygonGroup>,
            bounds: Option<ItemBounds>,
        }

        pub struct CircleGroup {
            stroke_color: Color,
            fill_color: Color,
            circles: Vec<Circle>,
        }

        pub struct Circle {
            x: f64,
            y: f64,
            r: f64,
        }

        pub struct LineGroup {
            color: Color,
            lines: Vec<Line>,
        }

        pub struct Line {
            ax: f64,
            ay: f64,
            bx: f64,
            by: f64,
        }

        pub struct PolygonGroup {
            stroke_color: Color,
            fill_color: Color,
            vertices: Vec<(f64, f64)>,
        }

        impl Vis2DPlane {
            pub fn new(h: f64, w: f64) -> Self {
                Self {
                    h,
                    w,
                    circle_groups: Vec::new(),
                    line_groups: Vec::new(),
                    polygon_groups: Vec::new(),
                    bounds: None,
                }
            }

            pub fn with_bounds(h: f64, w: f64, bounds: ItemBounds) -> Self {
                Self {
                    h,
                    w,
                    circle_groups: Vec::new(),
                    line_groups: Vec::new(),
                    polygon_groups: Vec::new(),
                    bounds: Some(bounds),
                }
            }

            pub fn set_bounds(&mut self, bounds: ItemBounds) {
                self.bounds = Some(bounds);
            }

            pub fn add_circle_group(
                &mut self,
                stroke_color: Color,
                fill_color: Color,
                circles: Vec<Circle>,
            ) {
                self.circle_groups.push(CircleGroup {
                    stroke_color,
                    fill_color,
                    circles,
                });
            }

            pub fn add_circle(
                &mut self,
                stroke_color: Color,
                fill_color: Color,
                x: f64,
                y: f64,
                r: f64,
            ) {
                self.add_circle_group(stroke_color, fill_color, vec![Circle { x, y, r }]);
            }

            pub fn add_line_group(&mut self, color: Color, lines: Vec<Line>) {
                self.line_groups.push(LineGroup { color, lines });
            }

            pub fn add_line(&mut self, color: Color, ax: f64, ay: f64, bx: f64, by: f64) {
                self.add_line_group(color, vec![Line { ax, ay, bx, by }]);
            }

            pub fn add_polygon(
                &mut self,
                stroke_color: Color,
                fill_color: Color,
                vertices: Vec<(f64, f64)>,
            ) {
                self.polygon_groups.push(PolygonGroup {
                    stroke_color,
                    fill_color,
                    vertices,
                });
            }

            pub fn to_vis_string(&self, mode: &str) -> String {
                let mut s = String::new();

                // Output 2D_PLANE header with optional bounds
                if let Some(bounds) = &self.bounds {
                    writeln!(
                        &mut s,
                        "$v({}) 2D_PLANE({}, {}, {}, {}) {} {}",
                        mode, bounds.min_x, bounds.min_y, bounds.max_x, bounds.max_y, self.h, self.w
                    )
                    .unwrap();
                } else {
                    writeln!(&mut s, "$v({}) 2D_PLANE {} {}", mode, self.h, self.w).unwrap();
                }

                // Output circles
                if !self.circle_groups.is_empty() {
                    writeln!(&mut s, "CIRCLES").unwrap();
                    writeln!(&mut s, "{}", self.circle_groups.len()).unwrap();
                    for group in &self.circle_groups {
                        write!(
                            &mut s,
                            "{} {} {}",
                            group.stroke_color,
                            group.fill_color,
                            group.circles.len()
                        )
                        .unwrap();
                        for circle in &group.circles {
                            write!(&mut s, " {} {} {}", circle.x, circle.y, circle.r).unwrap();
                        }
                        writeln!(&mut s).unwrap();
                    }
                }

                // Output lines
                if !self.line_groups.is_empty() {
                    writeln!(&mut s, "LINES").unwrap();
                    writeln!(&mut s, "{}", self.line_groups.len()).unwrap();
                    for group in &self.line_groups {
                        write!(&mut s, "{} {}", group.color, group.lines.len()).unwrap();
                        for line in &group.lines {
                            write!(&mut s, " {} {} {} {}", line.ax, line.ay, line.bx, line.by)
                                .unwrap();
                        }
                        writeln!(&mut s).unwrap();
                    }
                }

                // Output polygons
                if !self.polygon_groups.is_empty() {
                    writeln!(&mut s, "POLYGONS").unwrap();
                    writeln!(&mut s, "{}", self.polygon_groups.len()).unwrap();
                    for group in &self.polygon_groups {
                        write!(
                            &mut s,
                            "{} {} {}",
                            group.stroke_color,
                            group.fill_color,
                            group.vertices.len()
                        )
                        .unwrap();
                        for (x, y) in &group.vertices {
                            write!(&mut s, " {x} {y}").unwrap();
                        }
                        writeln!(&mut s).unwrap();
                    }
                }

                s
            }
        }

        pub struct VisGrid {
            h: usize,
            w: usize,
            conf: VisGridConf,
            cell_colors: Vec<Vec<Color>>,
            cell_texts: Vec<Vec<String>>,
            no_wall_vertical_pos: FxHashSet<(usize, usize)>,
            no_wall_horizontal_pos: FxHashSet<(usize, usize)>,
            lines: Vec<(Vec<(usize, usize)>, Color)>,
            bounds: Option<ItemBounds>,
        }

        impl VisGrid {
            pub fn new(h: usize, w: usize) -> Self {
                Self {
                    h,
                    w,
                    conf: Default::default(),
                    cell_colors: vec![vec![WHITE; w]; h],
                    cell_texts: vec![vec![String::new(); w]; h],
                    no_wall_vertical_pos: FxHashSet::default(),
                    no_wall_horizontal_pos: FxHashSet::default(),
                    lines: Vec::new(),
                    bounds: None,
                }
            }

            pub fn with_bounds(h: usize, w: usize, bounds: ItemBounds) -> Self {
                Self {
                    h,
                    w,
                    conf: Default::default(),
                    cell_colors: vec![vec![WHITE; w]; h],
                    cell_texts: vec![vec![String::new(); w]; h],
                    no_wall_vertical_pos: FxHashSet::default(),
                    no_wall_horizontal_pos: FxHashSet::default(),
                    lines: Vec::new(),
                    bounds: Some(bounds),
                }
            }

            pub fn set_bounds(&mut self, bounds: ItemBounds) {
                self.bounds = Some(bounds);
            }

            pub fn update_cell_color(&mut self, p: (usize, usize), color: Color) {
                self.cell_colors[p.1][p.0] = color;
            }

            pub fn add_line(&mut self, line: Vec<(usize, usize)>, color: Color) {
                self.lines.push((line, color));
            }

            pub fn remove_wall_vertical(&mut self, p: (usize, usize)) {
                self.no_wall_vertical_pos.insert(p);
            }

            pub fn add_wall_vertical(&mut self, p: (usize, usize)) {
                self.no_wall_vertical_pos.remove(&p);
            }

            pub fn remove_wall_horizontal(&mut self, p: (usize, usize)) {
                self.no_wall_horizontal_pos.insert(p);
            }

            pub fn add_wall_horizontal(&mut self, p: (usize, usize)) {
                self.no_wall_horizontal_pos.remove(&p);
            }

            pub fn from_cells<T>(cell_texts: &[Vec<T>]) -> Self
            where
                T: ToString,
            {
                let h = cell_texts.len();
                let w = cell_texts[0].len();
                let mut vis_grid = Self::new(h, w);
                for i in 0..h {
                    for j in 0..w {
                        vis_grid.cell_texts[i][j] = cell_texts[i][j].to_string();
                    }
                }
                vis_grid
            }

            pub fn to_vis_string(&self, mode_name: &str) -> String {
                let mut s = String::new();

                // G H W BORDER TEXT を書き込み (with optional bounds)
                if let Some(bounds) = &self.bounds {
                    writeln!(
                        &mut s,
                        "$v({}) GRID({}, {}, {}, {}) {} {} {} {} {}",
                        mode_name,
                        bounds.min_x,
                        bounds.min_y,
                        bounds.max_x,
                        bounds.max_y,
                        self.h,
                        self.w,
                        self.conf.border_color,
                        self.conf.text_color,
                        self.conf.default_cell_color
                    )
                    .unwrap();
                } else {
                    writeln!(
                        &mut s,
                        "$v({}) GRID {} {} {} {} {}",
                        mode_name,
                        self.h,
                        self.w,
                        self.conf.border_color,
                        self.conf.text_color,
                        self.conf.default_cell_color
                    )
                    .unwrap();
                }

                // 各セルの色の位置を書き込み
                writeln!(&mut s, "CELL_COLORS_POS").unwrap();
                let mut color_to_pos = FxHashMap::default();
                for y in 0..self.h {
                    for x in 0..self.w {
                        let color = self.cell_colors[y][x];
                        if color == self.conf.default_cell_color {
                            continue;
                        }
                        color_to_pos
                            .entry(color)
                            .or_insert_with(Vec::new)
                            .push((x, y));
                    }
                }
                writeln!(&mut s, "{}", color_to_pos.len()).unwrap();
                for (color, positions) in &color_to_pos {
                    write!(&mut s, "{} {}", color, positions.len()).unwrap();
                    for &(x, y) in positions {
                        write!(&mut s, " {y} {x}").unwrap();
                    }
                    writeln!(&mut s).unwrap();
                }
                // 各セルのテキストを書き込み
                writeln!(&mut s, "CELL_TEXT").unwrap();
                for y in 0..self.h {
                    for x in 0..self.w {
                        write!(&mut s, "{} ", self.cell_texts[y][x]).unwrap();
                    }
                    writeln!(&mut s).unwrap();
                }

                // 線分を書き込み
                writeln!(&mut s, "LINES").unwrap();
                writeln!(&mut s, "{}", self.lines.len()).unwrap();
                for (line, color) in &self.lines {
                    write!(&mut s, "{} {}", color, line.len()).unwrap();
                    for p in line {
                        write!(&mut s, " {} {}", p.0, p.1).unwrap();
                    }
                    writeln!(&mut s).unwrap();
                }
                // 壁を書き込む
                if !self.no_wall_horizontal_pos.is_empty() {
                    writeln!(&mut s, "WALL_HORIZONTAL").unwrap();
                    for y in 0..=self.h {
                        for x in 0..self.w {
                            if self.no_wall_horizontal_pos.contains(&(x, y)) {
                                write!(&mut s, "N").unwrap();
                            } else {
                                write!(&mut s, "Y").unwrap();
                            }
                        }
                        writeln!(&mut s).unwrap();
                    }
                }
                if !self.no_wall_vertical_pos.is_empty() {
                    writeln!(&mut s, "WALL_VERTICAL").unwrap();
                    for x in 0..self.h {
                        for y in 0..=self.w {
                            if self.no_wall_vertical_pos.contains(&(x, y)) {
                                write!(&mut s, "N").unwrap();
                            } else {
                                write!(&mut s, "Y").unwrap();
                            }
                        }
                        writeln!(&mut s).unwrap();
                    }
                }
                s
            }
        }

        #[derive(Clone, Copy, PartialEq, Eq, Hash)]
        pub struct Color {
            r: u8,
            g: u8,
            b: u8,
        }

        impl Color {
            pub const fn new(r: u8, g: u8, b: u8) -> Self {
                Self { r, g, b }
            }
        }

        impl Display for Color {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                write!(f, "#{:02X}{:02X}{:02X}", self.r, self.g, self.b)
            }
        }

        pub const WHITE: Color = Color::new(255, 255, 255);
        pub const BLACK: Color = Color::new(0, 0, 0);
        pub const GRAY: Color = Color::new(128, 128, 128);
        pub const RED: Color = Color::new(255, 0, 0);
        pub const BLUE: Color = Color::new(0, 0, 255);
        pub const GREEN: Color = Color::new(0, 255, 0);
        pub const YELLOW: Color = Color::new(255, 255, 0);
        pub const CYAN: Color = Color::new(0, 255, 255);
        pub const MAGENTA: Color = Color::new(255, 0, 255);

        pub struct VisGridConf {
            border_color: Color,
            text_color: Color,
            default_cell_color: Color,
        }

        impl VisGridConf {
            pub const fn new(
                border_color: Color,
                text_color: Color,
                default_cell_color: Color,
            ) -> Self {
                Self {
                    border_color,
                    text_color,
                    default_cell_color,
                }
            }
        }

        impl Default for VisGridConf {
            fn default() -> Self {
                VisGridConf::new(BLACK, BLACK, WHITE)
            }
        }
    }

    // ============================================================
    // vis feature が無効な場合の空実装 (Zero-cost)
    // ============================================================
    #[cfg(not(feature = "vis"))]
    mod vis_disabled {
        use std::fmt::Display;
        use std::path::PathBuf;

        // Dummy type for API compatibility
        pub enum OutputDestination {
            Stderr,
            File(PathBuf),
        }

        // VisRoot - Zero-Sized Type
        pub struct VisRoot;

        impl Default for VisRoot {
            #[inline(always)]
            fn default() -> Self {
                Self
            }
        }

        impl VisRoot {
            #[inline(always)]
            pub fn new() -> Self {
                Self
            }

            #[inline(always)]
            pub fn new_with_file<P: Into<PathBuf>>(_path: P) -> Self {
                Self
            }

            #[inline(always)]
            pub fn add_frame(&mut self, _mode: &str, _frame: VisFrame) {}

            #[inline(always)]
            pub fn add_frames(&mut self, _mode: &str, _frames: Vec<VisFrame>) {}

            #[inline(always)]
            pub fn get_frames(&self, _mode: &str) -> Option<&Vec<VisFrame>> {
                None
            }

            #[inline(always)]
            pub fn output_all(&self) {}
        }

        // VisFrame - Zero-Sized Type
        pub struct VisFrame;

        impl VisFrame {
            #[inline(always)]
            pub fn new_grid<T: ToString>(_grid: VisGrid, _score: T) -> Self {
                Self
            }

            #[inline(always)]
            pub fn new_2d_plane<T: ToString>(_plane: Vis2DPlane, _score: T) -> Self {
                Self
            }

            #[inline(always)]
            pub fn set_canvas(&mut self, _canvas: VisCanvas) {}

            #[inline(always)]
            pub fn set_grid(&mut self, _grid: VisGrid) {}

            #[inline(always)]
            pub fn set_2d_plane(&mut self, _plane: Vis2DPlane) {}

            #[inline(always)]
            pub fn set_score(&mut self, _score: String) {}

            #[inline(always)]
            pub fn add_textarea(&mut self, _text: String) {}

            #[inline(always)]
            pub fn enable_debug(&mut self) {}

            #[inline(always)]
            pub fn disable_debug(&mut self) {}

            #[inline(always)]
            pub fn to_vis_string(&self, _mode: &str) -> String {
                String::new()
            }
        }

        impl Default for VisFrame {
            #[inline(always)]
            fn default() -> Self {
                Self
            }
        }

        // ItemBounds - Zero-Sized Type
        pub struct ItemBounds;

        impl ItemBounds {
            #[inline(always)]
            pub fn new(_min_x: f64, _min_y: f64, _max_x: f64, _max_y: f64) -> Self {
                Self
            }
        }

        // VisCanvas - Zero-Sized Type
        pub struct VisCanvas;

        impl VisCanvas {
            #[inline(always)]
            pub fn new(_h: f64, _w: f64) -> Self {
                Self
            }

            #[inline(always)]
            pub fn to_vis_string(&self, _mode: &str) -> String {
                String::new()
            }
        }

        impl Default for VisCanvas {
            #[inline(always)]
            fn default() -> Self {
                Self
            }
        }

        // Vis2DPlane - Zero-Sized Type
        pub struct Vis2DPlane;

        impl Vis2DPlane {
            #[inline(always)]
            pub fn new(_h: f64, _w: f64) -> Self {
                Self
            }

            #[inline(always)]
            pub fn with_bounds(_h: f64, _w: f64, _bounds: ItemBounds) -> Self {
                Self
            }

            #[inline(always)]
            pub fn set_bounds(&mut self, _bounds: ItemBounds) {}

            #[inline(always)]
            pub fn add_circle_group(
                &mut self,
                _stroke_color: Color,
                _fill_color: Color,
                _circles: Vec<Circle>,
            ) {
            }

            #[inline(always)]
            pub fn add_circle(
                &mut self,
                _stroke_color: Color,
                _fill_color: Color,
                _x: f64,
                _y: f64,
                _r: f64,
            ) {
            }

            #[inline(always)]
            pub fn add_line_group(&mut self, _color: Color, _lines: Vec<Line>) {}

            #[inline(always)]
            pub fn add_line(&mut self, _color: Color, _ax: f64, _ay: f64, _bx: f64, _by: f64) {}

            #[inline(always)]
            pub fn add_polygon(
                &mut self,
                _stroke_color: Color,
                _fill_color: Color,
                _vertices: Vec<(f64, f64)>,
            ) {
            }

            #[inline(always)]
            pub fn to_vis_string(&self, _mode: &str) -> String {
                String::new()
            }
        }

        // VisGrid - Zero-Sized Type
        pub struct VisGrid;

        impl VisGrid {
            #[inline(always)]
            pub fn new(_h: usize, _w: usize) -> Self {
                Self
            }

            #[inline(always)]
            pub fn with_bounds(_h: usize, _w: usize, _bounds: ItemBounds) -> Self {
                Self
            }

            #[inline(always)]
            pub fn set_bounds(&mut self, _bounds: ItemBounds) {}

            #[inline(always)]
            pub fn update_cell_color(&mut self, _p: (usize, usize), _color: Color) {}

            #[inline(always)]
            pub fn add_line(&mut self, _line: Vec<(usize, usize)>, _color: Color) {}

            #[inline(always)]
            pub fn remove_wall_vertical(&mut self, _p: (usize, usize)) {}

            #[inline(always)]
            pub fn add_wall_vertical(&mut self, _p: (usize, usize)) {}

            #[inline(always)]
            pub fn remove_wall_horizontal(&mut self, _p: (usize, usize)) {}

            #[inline(always)]
            pub fn add_wall_horizontal(&mut self, _p: (usize, usize)) {}

            #[inline(always)]
            pub fn from_cells<T>(_cell_texts: &[Vec<T>]) -> Self
            where
                T: ToString,
            {
                Self
            }

            #[inline(always)]
            pub fn to_vis_string(&self, _mode_name: &str) -> String {
                String::new()
            }
        }

        // Helper structs - Zero-Sized Types
        pub struct CircleGroup;
        pub struct Circle;
        pub struct LineGroup;
        pub struct Line;
        pub struct PolygonGroup;
        pub struct VisGridConf;

        impl Default for VisGridConf {
            #[inline(always)]
            fn default() -> Self {
                Self
            }
        }

        impl VisGridConf {
            #[inline(always)]
            pub const fn new(
                _border_color: Color,
                _text_color: Color,
                _default_cell_color: Color,
            ) -> Self {
                Self
            }
        }

        // Color - Keep minimal implementation for API compatibility
        #[derive(Clone, Copy, PartialEq, Eq, Hash)]
        pub struct Color;

        impl Color {
            #[inline(always)]
            pub const fn new(_r: u8, _g: u8, _b: u8) -> Self {
                Self
            }
        }

        impl Display for Color {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                write!(f, "")
            }
        }

        pub const WHITE: Color = Color;
        pub const BLACK: Color = Color;
        pub const GRAY: Color = Color;
        pub const RED: Color = Color;
        pub const BLUE: Color = Color;
        pub const GREEN: Color = Color;
        pub const YELLOW: Color = Color;
        pub const CYAN: Color = Color;
        pub const MAGENTA: Color = Color;
    }

    // Re-export based on feature flag
    #[cfg(feature = "vis")]
    pub use vis_enabled::*;

    #[cfg(not(feature = "vis"))]
    pub use vis_disabled::*;
}
