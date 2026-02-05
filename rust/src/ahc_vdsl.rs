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

            pub fn add_frame(&mut self, mode: &str, frame: VisFrame) -> &mut Self {
                let frames = self.fames_by_mode.entry(mode.to_string()).or_default();
                frames.push(frame);
                self
            }

            pub fn add_frames(&mut self, mode: &str, mut frames: Vec<VisFrame>) -> &mut Self {
                let existing_frames = self.fames_by_mode.entry(mode.to_string()).or_default();
                existing_frames.append(&mut frames);
                self
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

        pub enum VisItem {
            Grid(VisGrid),
            Plane(Vis2DPlane),
        }

        impl VisItem {
            pub fn to_vis_string(&self, mode: &str) -> String {
                match self {
                    VisItem::Grid(grid) => grid.to_vis_string(mode),
                    VisItem::Plane(plane) => plane.to_vis_string(mode),
                }
            }
        }

        pub struct VisTextArea {
            title: String,
            height: Option<u32>,
            text_color: Option<String>,
            fill_color: Option<String>,
            text: String,
        }

        impl VisTextArea {
            pub fn new(title: String, text: String) -> Self {
                Self {
                    title,
                    height: Some(200),
                    text_color: Some("#000000".to_string()),
                    fill_color: Some("#ffffff".to_string()),
                    text,
                }
            }

            pub fn height(mut self, height: u32) -> Self {
                self.height = Some(height);
                self
            }

            pub fn text_color(mut self, color: String) -> Self {
                self.text_color = Some(color);
                self
            }

            pub fn fill_color(mut self, color: String) -> Self {
                self.fill_color = Some(color);
                self
            }
        }

        pub struct VisFrame {
            vis_canvas: Option<VisCanvas>,
            items: Vec<VisItem>,
            score: String,
            textarea: Vec<VisTextArea>,
            bar_graphs: Vec<VisBarGraph>,
            with_debug: bool,
        }

        impl VisFrame {
            pub fn new() -> Self {
                Self {
                    vis_canvas: None,
                    items: Vec::new(),
                    score: String::new(),
                    textarea: Vec::new(),
                    bar_graphs: Vec::new(),
                    with_debug: false,
                }
            }

            pub fn set_canvas(mut self, canvas: VisCanvas) -> Self {
                self.vis_canvas = Some(canvas);
                self
            }

            pub fn add_grid(mut self, grid: VisGrid) -> Self {
                self.items.push(VisItem::Grid(grid));
                self
            }

            pub fn add_2d_plane(mut self, plane: Vis2DPlane) -> Self {
                self.items.push(VisItem::Plane(plane));
                self
            }

            pub fn add_item(mut self, item: VisItem) -> Self {
                self.items.push(item);
                self
            }

            pub fn set_score(mut self, score: String) -> Self {
                self.score = score;
                self
            }

            pub fn add_textarea(mut self, textarea: VisTextArea) -> Self {
                self.textarea.push(textarea);
                self
            }

            pub fn add_bar_graph(mut self, bar_graph: VisBarGraph) -> Self {
                self.bar_graphs.push(bar_graph);
                self
            }

            pub fn enable_debug(mut self) -> Self {
                self.with_debug = true;
                self
            }

            pub fn disable_debug(mut self) -> Self {
                self.with_debug = false;
                self
            }

            pub fn to_vis_string(&self, mode: &str) -> String {
                let mut output = String::new();

                // Output canvas if present
                if let Some(canvas) = &self.vis_canvas {
                    output.push_str(&canvas.to_vis_string(mode));
                }

                // Output all items
                for item in &self.items {
                    output.push_str(&item.to_vis_string(mode));
                }

                // Output score
                if !self.score.is_empty() {
                    writeln!(&mut output, "$v({}) SCORE {}", mode, self.score).unwrap();
                }

                // Output textarea
                for textarea in &self.textarea {
                    let height = textarea.height.unwrap_or(200);
                    let text_color = textarea.text_color.as_deref().unwrap_or("#000000");
                    let fill_color = textarea.fill_color.as_deref().unwrap_or("#ffffff");
                    let text_output = if textarea.text.is_empty() {
                        "\"\"".to_string()
                    } else {
                        textarea.text.clone()
                    };
                    writeln!(
                        &mut output,
                        "$v({}) TEXTAREA {} {} {} {} {}",
                        mode, textarea.title, height, text_color, fill_color, text_output
                    )
                    .unwrap();
                }

                // Output bar graphs
                for bar_graph in &self.bar_graphs {
                    output.push_str(&bar_graph.to_vis_string(mode));
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
                Self::new()
            }
        }

        pub struct ItemBounds {
            pub left: f64,
            pub top: f64,
            pub right: f64,
            pub bottom: f64,
        }

        impl ItemBounds {
            pub fn new(left: f64, top: f64, right: f64, bottom: f64) -> Self {
                Self {
                    left,
                    top,
                    right,
                    bottom,
                }
            }
        }

        pub struct Vis2DPlane {
            h: f64,
            w: f64,
            circle_groups: FxHashMap<(Color, Color), Vec<Circle>>,
            line_groups: FxHashMap<(Color, u64), (f64, Vec<((f64, f64), (f64, f64))>)>,
            polygon_groups: Vec<PolygonGroup>,
            bounds: Option<ItemBounds>,
        }

        pub struct Circle {
            x: f64,
            y: f64,
            r: f64,
        }

        pub struct PolygonGroup {
            stroke_color: Color,
            fill_color: Color,
            vertices: Vec<(f64, f64)>,
        }

        impl Vis2DPlane {
            pub fn new(h: f64, w: f64, bounds: Option<ItemBounds>) -> Self {
                Self {
                    h,
                    w,
                    circle_groups: FxHashMap::default(),
                    line_groups: FxHashMap::default(),
                    polygon_groups: Vec::new(),
                    bounds,
                }
            }

            pub fn set_bounds(mut self, bounds: ItemBounds) -> Self {
                self.bounds = Some(bounds);
                self
            }

            pub fn add_circle_group(
                mut self,
                stroke_color: Color,
                fill_color: Color,
                circles: Vec<Circle>,
            ) -> Self {
                self.circle_groups
                    .entry((stroke_color, fill_color))
                    .or_default()
                    .extend(circles);
                self
            }

            pub fn add_circle(
                mut self,
                stroke_color: Color,
                fill_color: Color,
                x: f64,
                y: f64,
                r: f64,
            ) -> Self {
                self.circle_groups
                    .entry((stroke_color, fill_color))
                    .or_default()
                    .push(Circle { x, y, r });
                self
            }

            pub fn add_line_group(
                mut self,
                color: Color,
                width: f64,
                points: Vec<(f64, f64)>,
            ) -> Self {
                let width_key = width.to_bits();
                // pointsをペアに変換 (2点で一つの線)
                let lines: Vec<((f64, f64), (f64, f64))> = points
                    .chunks_exact(2)
                    .map(|chunk| (chunk[0], chunk[1]))
                    .collect();
                self.line_groups
                    .entry((color, width_key))
                    .or_insert_with(|| (width, Vec::new()))
                    .1
                    .extend(lines);
                self
            }

            pub fn add_line(
                mut self,
                color: Color,
                width: f64,
                ax: f64,
                ay: f64,
                bx: f64,
                by: f64,
            ) -> Self {
                let width_key = width.to_bits();
                let entry = self
                    .line_groups
                    .entry((color, width_key))
                    .or_insert_with(|| (width, Vec::new()));
                entry.1.push(((ax, ay), (bx, by)));
                self
            }

            pub fn add_polygon(
                mut self,
                stroke_color: Color,
                fill_color: Color,
                vertices: Vec<(f64, f64)>,
            ) -> Self {
                self.polygon_groups.push(PolygonGroup {
                    stroke_color,
                    fill_color,
                    vertices,
                });
                self
            }

            pub fn to_vis_string(&self, mode: &str) -> String {
                let mut s = String::new();

                // Output 2D_PLANE header with optional bounds
                if let Some(bounds) = &self.bounds {
                    writeln!(
                        &mut s,
                        "$v({}) 2D_PLANE({}, {}, {}, {}) {} {}",
                        mode, bounds.left, bounds.top, bounds.right, bounds.bottom, self.h, self.w
                    )
                    .unwrap();
                } else {
                    writeln!(&mut s, "$v({}) 2D_PLANE {} {}", mode, self.h, self.w).unwrap();
                }

                // Output circles
                if !self.circle_groups.is_empty() {
                    writeln!(&mut s, "CIRCLES").unwrap();
                    writeln!(&mut s, "{}", self.circle_groups.len()).unwrap();
                    for ((stroke_color, fill_color), circles) in &self.circle_groups {
                        write!(&mut s, "{} {} {}", stroke_color, fill_color, circles.len())
                            .unwrap();
                        for circle in circles {
                            write!(&mut s, " {} {} {}", circle.x, circle.y, circle.r).unwrap();
                        }
                        writeln!(&mut s).unwrap();
                    }
                }

                // Output lines
                if !self.line_groups.is_empty() {
                    writeln!(&mut s, "LINES").unwrap();
                    writeln!(&mut s, "{}", self.line_groups.len()).unwrap();
                    for ((color, _width_key), (width, lines)) in &self.line_groups {
                        write!(&mut s, "{} {} {}", color, width, lines.len()).unwrap();
                        for ((x1, y1), (x2, y2)) in lines {
                            write!(&mut s, " {x1} {y1} {x2} {y2}").unwrap();
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
            pub fn new(h: usize, w: usize, bounds: Option<ItemBounds>) -> Self {
                Self {
                    h,
                    w,
                    conf: Default::default(),
                    cell_colors: vec![vec![WHITE; w]; h],
                    cell_texts: vec![vec![String::new(); w]; h],
                    no_wall_vertical_pos: FxHashSet::default(),
                    no_wall_horizontal_pos: FxHashSet::default(),
                    lines: Vec::new(),
                    bounds,
                }
            }

            pub fn set_bounds(mut self, bounds: ItemBounds) -> Self {
                self.bounds = Some(bounds);
                self
            }

            pub fn update_cell_color(mut self, p: (usize, usize), color: Color) -> Self {
                self.cell_colors[p.1][p.0] = color;
                self
            }

            pub fn update_text(mut self, p: (usize, usize), text: String) -> Self {
                self.cell_texts[p.1][p.0] = text;
                self
            }

            pub fn add_line(mut self, line: Vec<(usize, usize)>, color: Color) -> Self {
                self.lines.push((line, color));
                self
            }

            pub fn remove_wall_vertical(mut self, p: (usize, usize)) -> Self {
                self.no_wall_vertical_pos.insert(p);
                self
            }

            pub fn add_wall_vertical(mut self, p: (usize, usize)) -> Self {
                self.no_wall_vertical_pos.remove(&p);
                self
            }

            pub fn remove_wall_horizontal(mut self, p: (usize, usize)) -> Self {
                self.no_wall_horizontal_pos.insert(p);
                self
            }

            pub fn add_wall_horizontal(mut self, p: (usize, usize)) -> Self {
                self.no_wall_horizontal_pos.remove(&p);
                self
            }

            pub fn to_vis_string(&self, mode_name: &str) -> String {
                let mut s = String::new();

                // G H W BORDER TEXT を書き込み (with optional bounds)
                if let Some(bounds) = &self.bounds {
                    writeln!(
                        &mut s,
                        "$v({}) GRID({}, {}, {}, {}) {} {} {} {} {}",
                        mode_name,
                        bounds.left,
                        bounds.top,
                        bounds.right,
                        bounds.bottom,
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
                        write!(&mut s, " {x} {y}").unwrap();
                    }
                    writeln!(&mut s).unwrap();
                }
                // 各セルのテキストを書き込み（すべて空の場合は省略）
                let all_texts_empty = self
                    .cell_texts
                    .iter()
                    .all(|row| row.iter().all(|t| t.is_empty()));
                if !all_texts_empty {
                    writeln!(&mut s, "CELL_TEXT").unwrap();
                    for y in 0..self.h {
                        // その行の末尾側の空セルは省略し、途中の空セルは "" で出力
                        let last_non_empty = (0..self.w)
                            .rev()
                            .find(|&x| !self.cell_texts[y][x].is_empty());
                        if let Some(last) = last_non_empty {
                            for x in 0..=last {
                                if x > 0 {
                                    write!(&mut s, " ").unwrap();
                                }
                                if self.cell_texts[y][x].is_empty() {
                                    write!(&mut s, "\"\"").unwrap();
                                } else {
                                    write!(&mut s, "{}", self.cell_texts[y][x]).unwrap();
                                }
                            }
                        }
                        writeln!(&mut s).unwrap();
                    }
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

        impl From<&String> for Color {
            fn from(s: &String) -> Self {
                let s = s.trim_start_matches('#');
                let r = u8::from_str_radix(&s[0..2], 16).unwrap_or(0);
                let g = u8::from_str_radix(&s[2..4], 16).unwrap_or(0);
                let b = u8::from_str_radix(&s[4..6], 16).unwrap_or(0);
                Color::new(r, g, b)
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

        pub struct BarGraphItem {
            pub label: String,
            pub value: f64,
        }

        impl BarGraphItem {
            pub fn new(label: String, value: f64) -> Self {
                Self { label, value }
            }
        }

        pub struct VisBarGraph {
            fill_color: Color,
            y_min: f64,
            y_max: f64,
            items: Vec<BarGraphItem>,
        }

        impl VisBarGraph {
            pub fn new(fill_color: Color, y_min: f64, y_max: f64) -> Self {
                Self {
                    fill_color,
                    y_min,
                    y_max,
                    items: Vec::new(),
                }
            }

            pub fn add_item(mut self, label: String, value: f64) -> Self {
                self.items.push(BarGraphItem::new(label, value));
                self
            }

            pub fn add_items(mut self, items: Vec<BarGraphItem>) -> Self {
                self.items.extend(items);
                self
            }

            pub fn to_vis_string(&self, mode: &str) -> String {
                let mut s = String::new();

                writeln!(
                    &mut s,
                    "$v({}) BAR_GRAPH {} {} {}",
                    mode, self.fill_color, self.y_min, self.y_max
                )
                .unwrap();

                // Output items count and data
                write!(&mut s, "{}", self.items.len()).unwrap();
                for item in &self.items {
                    write!(&mut s, " {} {}", item.label, item.value).unwrap();
                }
                writeln!(&mut s).unwrap();

                s
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

        // VisTextArea - Zero-Sized Type
        pub struct VisTextArea;

        impl VisTextArea {
            #[inline(always)]
            pub fn new(_title: String, _text: String) -> Self {
                Self
            }

            #[inline(always)]
            pub fn height(self, _height: u32) -> Self {
                self
            }

            #[inline(always)]
            pub fn text_color(self, _color: String) -> Self {
                self
            }

            #[inline(always)]
            pub fn fill_color(self, _color: String) -> Self {
                self
            }
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
            pub fn add_frame(&mut self, _mode: &str, _frame: VisFrame) -> &mut Self {
                self
            }

            #[inline(always)]
            pub fn add_frames(&mut self, _mode: &str, _frames: Vec<VisFrame>) -> &mut Self {
                self
            }

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
            pub fn new() -> Self {
                Self
            }

            #[inline(always)]
            pub fn new_grid<T: ToString>(_grid: VisGrid, _score: T) -> Self {
                Self
            }

            #[inline(always)]
            pub fn new_2d_plane<T: ToString>(_plane: Vis2DPlane, _score: T) -> Self {
                Self
            }

            #[inline(always)]
            pub fn set_canvas(self, _canvas: VisCanvas) -> Self {
                self
            }

            #[inline(always)]
            pub fn add_grid(self, _grid: VisGrid) -> Self {
                self
            }

            #[inline(always)]
            pub fn add_2d_plane(self, _plane: Vis2DPlane) -> Self {
                self
            }

            #[inline(always)]
            pub fn add_item(self, _item: VisItem) -> Self {
                self
            }

            #[inline(always)]
            pub fn set_score(self, _score: String) -> Self {
                self
            }

            #[inline(always)]
            pub fn add_textarea(self, _textarea: VisTextArea) -> Self {
                self
            }

            #[inline(always)]
            pub fn add_bar_graph(self, _bar_graph: VisBarGraph) -> Self {
                self
            }

            #[inline(always)]
            pub fn enable_debug(self) -> Self {
                self
            }

            #[inline(always)]
            pub fn disable_debug(self) -> Self {
                self
            }

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
            pub fn new(_left: f64, _top: f64, _right: f64, _bottom: f64) -> Self {
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

        // VisItem - Zero-Sized Type
        pub enum VisItem {
            Grid(VisGrid),
            Plane(Vis2DPlane),
        }

        impl VisItem {
            #[inline(always)]
            pub fn to_vis_string(&self, _mode: &str) -> String {
                String::new()
            }
        }

        // Vis2DPlane - Zero-Sized Type
        pub struct Vis2DPlane;

        impl Vis2DPlane {
            #[inline(always)]
            pub fn new(_h: f64, _w: f64, _bounds: Option<ItemBounds>) -> Self {
                Self
            }

            #[inline(always)]
            pub fn with_bounds(_h: f64, _w: f64, _bounds: ItemBounds) -> Self {
                Self
            }

            #[inline(always)]
            pub fn set_bounds(self, _bounds: ItemBounds) -> Self {
                self
            }

            #[inline(always)]
            pub fn add_circle_group(
                self,
                _stroke_color: Color,
                _fill_color: Color,
                _circles: Vec<Circle>,
            ) -> Self {
                self
            }

            #[inline(always)]
            pub fn add_circle(
                self,
                _stroke_color: Color,
                _fill_color: Color,
                _x: f64,
                _y: f64,
                _r: f64,
            ) -> Self {
                self
            }

            #[inline(always)]
            pub fn add_line_group(
                self,
                _color: Color,
                _width: f64,
                _points: Vec<(f64, f64)>,
            ) -> Self {
                self
            }

            #[inline(always)]
            pub fn add_line(
                self,
                _color: Color,
                _width: f64,
                _ax: f64,
                _ay: f64,
                _bx: f64,
                _by: f64,
            ) -> Self {
                self
            }

            #[inline(always)]
            pub fn add_polygon(
                self,
                _stroke_color: Color,
                _fill_color: Color,
                _vertices: Vec<(f64, f64)>,
            ) -> Self {
                self
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
            pub fn new(_h: usize, _w: usize, _bounds: Option<ItemBounds>) -> Self {
                Self
            }

            #[inline(always)]
            pub fn with_bounds(_h: usize, _w: usize, _bounds: ItemBounds) -> Self {
                Self
            }

            #[inline(always)]
            pub fn set_bounds(self, _bounds: ItemBounds) -> Self {
                self
            }

            #[inline(always)]
            pub fn update_cell_color(self, _p: (usize, usize), _color: Color) -> Self {
                self
            }

            #[inline(always)]
            pub fn update_text(self, _p: (usize, usize), _text: String) -> Self {
                self
            }

            #[inline(always)]
            pub fn add_line(self, _line: Vec<(usize, usize)>, _color: Color) -> Self {
                self
            }

            #[inline(always)]
            pub fn remove_wall_vertical(self, _p: (usize, usize)) -> Self {
                self
            }

            #[inline(always)]
            pub fn add_wall_vertical(self, _p: (usize, usize)) -> Self {
                self
            }

            #[inline(always)]
            pub fn remove_wall_horizontal(self, _p: (usize, usize)) -> Self {
                self
            }

            #[inline(always)]
            pub fn add_wall_horizontal(self, _p: (usize, usize)) -> Self {
                self
            }

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

        impl From<&String> for Color {
            #[inline(always)]
            fn from(_hex: &String) -> Self {
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

        // BarGraphItem - Zero-Sized Type
        pub struct BarGraphItem;

        impl BarGraphItem {
            #[inline(always)]
            pub fn new(_label: String, _value: f64) -> Self {
                Self
            }
        }

        // VisBarGraph - Zero-Sized Type
        pub struct VisBarGraph;

        impl VisBarGraph {
            #[inline(always)]
            pub fn new(_fill_color: Color, _y_min: f64, _y_max: f64) -> Self {
                Self
            }

            #[inline(always)]
            pub fn add_item(self, _label: String, _value: f64) -> Self {
                self
            }

            #[inline(always)]
            pub fn add_items(self, _items: Vec<BarGraphItem>) -> Self {
                self
            }

            #[inline(always)]
            pub fn to_vis_string(&self, _mode: &str) -> String {
                String::new()
            }
        }
    }

    // Re-export based on feature flag
    #[cfg(feature = "vis")]
    pub use vis_enabled::*;

    #[cfg(not(feature = "vis"))]
    pub use vis_disabled::*;
}
