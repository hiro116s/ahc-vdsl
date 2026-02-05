#include <algorithm>
#include <cassert>
#include <cstdio>
#include <cstdint>
#include <fstream>
#include <iostream>
#include <map>
#include <optional>
#include <set>
#include <sstream>
#include <string>
#include <variant>
#include <vector>

namespace ahc_vdsl {

#ifdef ENABLE_VIS

// ===== Visualization ENABLED =====

struct Color {
    uint8_t r, g, b;

    constexpr Color(uint8_t r = 0, uint8_t g = 0, uint8_t b = 0) : r(r), g(g), b(b) {}

    bool operator==(const Color& other) const {
        return r == other.r && g == other.g && b == other.b;
    }

    bool operator<(const Color& other) const {
        if (r != other.r) return r < other.r;
        if (g != other.g) return g < other.g;
        return b < other.b;
    }

    std::string to_string() const {
        char buf[8];
        snprintf(buf, sizeof(buf), "#%02X%02X%02X", r, g, b);
        return std::string(buf);
    }

    static Color from_string(const std::string& s) {
        const char* hex = s.c_str();
        if (!s.empty() && s[0] == '#') hex++;
        unsigned int rv = 0, gv = 0, bv = 0;
        sscanf(hex, "%2x%2x%2x", &rv, &gv, &bv);
        return Color(static_cast<uint8_t>(rv), static_cast<uint8_t>(gv), static_cast<uint8_t>(bv));
    }
};

constexpr Color WHITE(255, 255, 255);
constexpr Color BLACK(0, 0, 0);
constexpr Color GRAY(128, 128, 128);
constexpr Color RED(255, 0, 0);
constexpr Color BLUE(0, 0, 255);
constexpr Color GREEN(0, 255, 0);
constexpr Color YELLOW(255, 255, 0);
constexpr Color CYAN(0, 255, 255);
constexpr Color MAGENTA(255, 0, 255);

struct ItemBounds {
    double left, top, right, bottom;

    ItemBounds(double left, double top, double right, double bottom)
        : left(left), top(top), right(right), bottom(bottom) {}
};

struct VisGridConf {
    Color border_color;
    Color text_color;
    Color default_cell_color;

    VisGridConf(Color border = BLACK, Color text = BLACK, Color bg = WHITE)
        : border_color(border), text_color(text), default_cell_color(bg) {}
};

class VisTextArea {
    std::string title;
    unsigned int height;
    std::string text_color;
    std::string fill_color;
    std::string text;

public:
    VisTextArea(const std::string& title, const std::string& text)
        : title(title), height(200), text_color("#000000"), fill_color("#ffffff"), text(text) {}

    VisTextArea& set_height(unsigned int h) { height = h; return *this; }
    VisTextArea& set_text_color(const std::string& c) { text_color = c; return *this; }
    VisTextArea& set_fill_color(const std::string& c) { fill_color = c; return *this; }

    const std::string& get_title() const { return title; }
    unsigned int get_height() const { return height; }
    const std::string& get_text_color() const { return text_color; }
    const std::string& get_fill_color() const { return fill_color; }
    const std::string& get_text() const { return text; }
};

struct BarGraphItem {
    std::string label;
    double value;
    BarGraphItem(const std::string& label, double value) : label(label), value(value) {}
};

class VisBarGraph {
    Color fill_color;
    double y_min, y_max;
    std::vector<BarGraphItem> items;

public:
    VisBarGraph(Color fill_color, double y_min, double y_max)
        : fill_color(fill_color), y_min(y_min), y_max(y_max) {}

    VisBarGraph& add_item(const std::string& label, double value) {
        items.emplace_back(label, value);
        return *this;
    }

    VisBarGraph& add_items(const std::vector<BarGraphItem>& new_items) {
        items.insert(items.end(), new_items.begin(), new_items.end());
        return *this;
    }

    std::string to_vis_string(const std::string& mode) const {
        std::ostringstream ss;
        ss << "$v(" << mode << ") BAR_GRAPH " << fill_color.to_string()
           << " " << y_min << " " << y_max << "\n";
        ss << items.size();
        for (const auto& item : items) {
            ss << " " << item.label << " " << item.value;
        }
        ss << "\n";
        return ss.str();
    }
};

class VisGrid {
    int h, w;
    VisGridConf conf;
    std::vector<std::vector<Color>> cell_colors;
    std::vector<std::vector<std::string>> cell_texts;
    std::set<std::pair<int, int>> no_wall_vertical_pos;
    std::set<std::pair<int, int>> no_wall_horizontal_pos;
    std::vector<std::pair<std::vector<std::pair<int, int>>, Color>> lines;
    std::optional<ItemBounds> bounds;

public:
    VisGrid(int h, int w, std::optional<ItemBounds> bounds = std::nullopt,
            VisGridConf conf = VisGridConf())
        : h(h), w(w), conf(conf),
          cell_colors(h, std::vector<Color>(w, WHITE)),
          cell_texts(h, std::vector<std::string>(w, "")),
          bounds(std::move(bounds)) {}

    void set_bounds(const ItemBounds& b) { bounds = b; }

    void update_cell_color(int x, int y, Color color) {
        cell_colors[y][x] = color;
    }

    void update_text(int x, int y, const std::string& text) {
        cell_texts[y][x] = text;
    }

    void add_line(const std::vector<std::pair<int, int>>& line, Color color) {
        lines.push_back({line, color});
    }

    void remove_wall_vertical(int x, int y) {
        no_wall_vertical_pos.insert({x, y});
    }

    void add_wall_vertical(int x, int y) {
        no_wall_vertical_pos.erase({x, y});
    }

    void remove_wall_horizontal(int x, int y) {
        no_wall_horizontal_pos.insert({x, y});
    }

    void add_wall_horizontal(int x, int y) {
        no_wall_horizontal_pos.erase({x, y});
    }

    template<typename T>
    static VisGrid from_cells(const std::vector<std::vector<T>>& cell_texts_in) {
        int h = static_cast<int>(cell_texts_in.size());
        int w = h > 0 ? static_cast<int>(cell_texts_in[0].size()) : 0;
        VisGrid grid(h, w);
        for (int i = 0; i < h; i++) {
            for (int j = 0; j < w; j++) {
                std::ostringstream oss;
                oss << cell_texts_in[i][j];
                grid.cell_texts[i][j] = oss.str();
            }
        }
        return grid;
    }

    std::string to_vis_string(const std::string& mode_name) const {
        std::ostringstream ss;

        // GRID header with optional bounds
        if (bounds) {
            ss << "$v(" << mode_name << ") GRID("
               << bounds->left << ", " << bounds->top << ", "
               << bounds->right << ", " << bounds->bottom << ") "
               << h << " " << w << " "
               << conf.border_color.to_string() << " "
               << conf.text_color.to_string() << " "
               << conf.default_cell_color.to_string() << "\n";
        } else {
            ss << "$v(" << mode_name << ") GRID " << h << " " << w << " "
               << conf.border_color.to_string() << " "
               << conf.text_color.to_string() << " "
               << conf.default_cell_color.to_string() << "\n";
        }

        // CELL_COLORS_POS
        ss << "CELL_COLORS_POS\n";
        std::map<Color, std::vector<std::pair<int, int>>> color_to_pos;
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                if (!(cell_colors[y][x] == conf.default_cell_color)) {
                    color_to_pos[cell_colors[y][x]].push_back({x, y});
                }
            }
        }
        ss << color_to_pos.size() << "\n";
        for (const auto& [color, positions] : color_to_pos) {
            ss << color.to_string() << " " << positions.size();
            for (const auto& [x, y] : positions) {
                ss << " " << x << " " << y;
            }
            ss << "\n";
        }

        // CELL_TEXT (skip entirely if all cells are empty)
        bool all_texts_empty = true;
        for (int y = 0; y < h && all_texts_empty; y++) {
            for (int x = 0; x < w && all_texts_empty; x++) {
                if (!cell_texts[y][x].empty()) {
                    all_texts_empty = false;
                }
            }
        }
        if (!all_texts_empty) {
            ss << "CELL_TEXT\n";
            for (int y = 0; y < h; y++) {
                // Find last non-empty cell in this row
                int last_non_empty = -1;
                for (int x = w - 1; x >= 0; x--) {
                    if (!cell_texts[y][x].empty()) {
                        last_non_empty = x;
                        break;
                    }
                }
                // Output up to last_non_empty; mid-row empties become ""
                if (last_non_empty >= 0) {
                    for (int x = 0; x <= last_non_empty; x++) {
                        if (x > 0) ss << " ";
                        if (cell_texts[y][x].empty()) {
                            ss << "\"\"";
                        } else {
                            ss << cell_texts[y][x];
                        }
                    }
                }
                ss << "\n";
            }
        }

        // LINES
        ss << "LINES\n";
        ss << lines.size() << "\n";
        for (const auto& [line, color] : lines) {
            ss << color.to_string() << " " << line.size();
            for (const auto& [x, y] : line) {
                ss << " " << x << " " << y;
            }
            ss << "\n";
        }

        // WALL_HORIZONTAL
        if (!no_wall_horizontal_pos.empty()) {
            ss << "WALL_HORIZONTAL\n";
            for (int y = 0; y <= h; y++) {
                for (int x = 0; x < w; x++) {
                    ss << (no_wall_horizontal_pos.count({x, y}) ? "N" : "Y");
                }
                ss << "\n";
            }
        }

        // WALL_VERTICAL
        if (!no_wall_vertical_pos.empty()) {
            ss << "WALL_VERTICAL\n";
            for (int x = 0; x < h; x++) {
                for (int y = 0; y <= w; y++) {
                    ss << (no_wall_vertical_pos.count({x, y}) ? "N" : "Y");
                }
                ss << "\n";
            }
        }

        return ss.str();
    }
};

class Vis2DPlane {
    double h, w;

    struct Circle {
        double x, y, r;
    };

    struct Segment {
        double ax, ay, bx, by;
    };

    struct PolygonGroup {
        Color stroke_color, fill_color;
        std::vector<std::pair<double, double>> vertices;
    };

    // Circles grouped by (stroke_color, fill_color)
    std::map<std::pair<Color, Color>, std::vector<Circle>> circle_groups;
    // Lines grouped by (color, width)
    std::map<std::pair<Color, double>, std::vector<Segment>> line_groups;
    std::vector<PolygonGroup> polygon_groups;
    std::optional<ItemBounds> bounds;

public:
    Vis2DPlane(double h, double w, std::optional<ItemBounds> bounds = std::nullopt)
        : h(h), w(w), bounds(std::move(bounds)) {}

    void set_bounds(const ItemBounds& b) { bounds = b; }

    void add_circle(Color stroke_color, Color fill_color, double x, double y, double r) {
        circle_groups[{stroke_color, fill_color}].push_back({x, y, r});
    }

    void add_line(Color color, double width, double ax, double ay, double bx, double by) {
        line_groups[{color, width}].push_back({ax, ay, bx, by});
    }

    void add_line_group(Color color, double width,
                        const std::vector<std::pair<double, double>>& points) {
        auto& segs = line_groups[{color, width}];
        for (size_t i = 0; i + 1 < points.size(); i += 2) {
            segs.push_back({points[i].first, points[i].second,
                            points[i + 1].first, points[i + 1].second});
        }
    }

    void add_polygon(Color stroke_color, Color fill_color,
                     const std::vector<std::pair<double, double>>& vertices) {
        polygon_groups.push_back({stroke_color, fill_color, vertices});
    }

    std::string to_vis_string(const std::string& mode) const {
        std::ostringstream ss;

        // 2D_PLANE header with optional bounds
        if (bounds) {
            ss << "$v(" << mode << ") 2D_PLANE("
               << bounds->left << ", " << bounds->top << ", "
               << bounds->right << ", " << bounds->bottom << ") "
               << h << " " << w << "\n";
        } else {
            ss << "$v(" << mode << ") 2D_PLANE " << h << " " << w << "\n";
        }

        // CIRCLES
        if (!circle_groups.empty()) {
            ss << "CIRCLES\n";
            ss << circle_groups.size() << "\n";
            for (const auto& [key, circles] : circle_groups) {
                const auto& [stroke, fill] = key;
                ss << stroke.to_string() << " "
                   << fill.to_string() << " "
                   << circles.size();
                for (const auto& c : circles) {
                    ss << " " << c.x << " " << c.y << " " << c.r;
                }
                ss << "\n";
            }
        }

        // LINES
        if (!line_groups.empty()) {
            ss << "LINES\n";
            ss << line_groups.size() << "\n";
            for (const auto& [key, segments] : line_groups) {
                const auto& [color, width] = key;
                ss << color.to_string() << " " << width << " " << segments.size();
                for (const auto& seg : segments) {
                    ss << " " << seg.ax << " " << seg.ay << " " << seg.bx << " " << seg.by;
                }
                ss << "\n";
            }
        }

        // POLYGONS
        if (!polygon_groups.empty()) {
            ss << "POLYGONS\n";
            ss << polygon_groups.size() << "\n";
            for (const auto& group : polygon_groups) {
                ss << group.stroke_color.to_string() << " "
                   << group.fill_color.to_string() << " "
                   << group.vertices.size();
                for (const auto& [x, y] : group.vertices) {
                    ss << " " << x << " " << y;
                }
                ss << "\n";
            }
        }

        return ss.str();
    }
};

class VisCanvas {
    double h, w;

public:
    VisCanvas(double h = 800, double w = 800) : h(h), w(w) {}

    std::string to_vis_string(const std::string& mode) const {
        std::ostringstream ss;
        ss << "$v(" << mode << ") CANVAS " << h << " " << w << "\n";
        return ss.str();
    }
};

using VisItem = std::variant<VisGrid, Vis2DPlane>;

class VisFrame {
    std::optional<VisCanvas> vis_canvas;
    std::vector<VisItem> items;
    std::string score;
    std::vector<VisTextArea> textareas;
    std::vector<VisBarGraph> bar_graphs;
    bool with_debug;

public:
    VisFrame() : with_debug(false) {}

    static VisFrame new_grid(const VisGrid& grid, const std::string& score) {
        VisFrame frame;
        frame.items.emplace_back(grid);
        frame.score = score;
        return frame;
    }

    static VisFrame new_2d_plane(const Vis2DPlane& plane, const std::string& score) {
        VisFrame frame;
        frame.items.emplace_back(plane);
        frame.score = score;
        return frame;
    }

    void set_canvas(const VisCanvas& canvas) { vis_canvas = canvas; }
    void set_score(const std::string& s) { score = s; }
    void add_grid(const VisGrid& grid) { items.emplace_back(grid); }
    void add_2d_plane(const Vis2DPlane& plane) { items.emplace_back(plane); }
    void add_item(const VisItem& item) { items.push_back(item); }
    void add_textarea(const VisTextArea& textarea) { textareas.push_back(textarea); }
    void add_bar_graph(const VisBarGraph& bar_graph) { bar_graphs.push_back(bar_graph); }
    void enable_debug() { with_debug = true; }
    void disable_debug() { with_debug = false; }

    std::string to_vis_string(const std::string& mode) const {
        std::ostringstream ss;

        if (vis_canvas) {
            ss << vis_canvas->to_vis_string(mode);
        }

        for (const auto& item : items) {
            std::visit([&](const auto& v) {
                ss << v.to_vis_string(mode);
            }, item);
        }

        if (!score.empty()) {
            ss << "$v(" << mode << ") SCORE " << score << "\n";
        }

        for (const auto& ta : textareas) {
            ss << "$v(" << mode << ") TEXTAREA "
               << ta.get_title() << " "
               << ta.get_height() << " "
               << ta.get_text_color() << " "
               << ta.get_fill_color() << " "
               << (ta.get_text().empty() ? "\"\"" : ta.get_text()) << "\n";
        }

        for (const auto& bg : bar_graphs) {
            ss << bg.to_vis_string(mode);
        }

        if (with_debug) {
            ss << "$v(" << mode << ") DEBUG\n";
        }

        ss << "$v(" << mode << ") COMMIT\n";

        return ss.str();
    }
};

enum class OutputDestination {
    Stderr,
    File
};

class VisRoot {
    std::map<std::string, std::vector<VisFrame>> frames_by_mode;
    OutputDestination output_destination;
    std::string output_file_path;

public:
    VisRoot() : output_destination(OutputDestination::Stderr) {}

    explicit VisRoot(const std::string& file_path)
        : output_destination(OutputDestination::File), output_file_path(file_path) {}

    void add_frame(const std::string& mode, const VisFrame& frame) {
        frames_by_mode[mode].push_back(frame);
    }

    void add_frames(const std::string& mode, const std::vector<VisFrame>& frames) {
        auto& existing = frames_by_mode[mode];
        existing.insert(existing.end(), frames.begin(), frames.end());
    }

    const std::vector<VisFrame>* get_frames(const std::string& mode) const {
        auto it = frames_by_mode.find(mode);
        if (it != frames_by_mode.end()) {
            return &it->second;
        }
        return nullptr;
    }

    void output_all() const {
        std::ostringstream output;

        for (const auto& [mode, frames] : frames_by_mode) {
            for (const auto& frame : frames) {
                output << frame.to_vis_string(mode);
            }
        }

        if (output_destination == OutputDestination::Stderr) {
            std::cerr << output.str();
        } else {
            std::ofstream ofs(output_file_path);
            if (ofs) {
                ofs << output.str();
            }
        }
    }
};

#else

// ===== Visualization DISABLED (Zero-cost) =====

struct Color {
    constexpr Color(uint8_t = 0, uint8_t = 0, uint8_t = 0) {}
    bool operator==(const Color&) const { return true; }
    bool operator<(const Color&) const { return false; }
    std::string to_string() const { return ""; }
    static Color from_string(const std::string&) { return Color(); }
};

constexpr Color WHITE;
constexpr Color BLACK;
constexpr Color GRAY;
constexpr Color RED;
constexpr Color BLUE;
constexpr Color GREEN;
constexpr Color YELLOW;
constexpr Color CYAN;
constexpr Color MAGENTA;

struct ItemBounds {
    ItemBounds(double = 0, double = 0, double = 0, double = 0) {}
};

struct VisGridConf {
    VisGridConf(Color = Color(), Color = Color(), Color = Color()) {}
};

class VisTextArea {
public:
    VisTextArea(const std::string& = "", const std::string& = "") {}
    VisTextArea& set_height(unsigned int) { return *this; }
    VisTextArea& set_text_color(const std::string&) { return *this; }
    VisTextArea& set_fill_color(const std::string&) { return *this; }
};

struct BarGraphItem {
    std::string label;
    double value;
    BarGraphItem(const std::string& label = "", double value = 0) : label(label), value(value) {}
};

class VisBarGraph {
public:
    VisBarGraph(Color = Color(), double = 0, double = 0) {}
    VisBarGraph& add_item(const std::string&, double) { return *this; }
    VisBarGraph& add_items(const std::vector<BarGraphItem>&) { return *this; }
    std::string to_vis_string(const std::string&) const { return ""; }
};

class VisGrid {
public:
    VisGrid(int = 0, int = 0, std::optional<ItemBounds> = std::nullopt,
            VisGridConf = VisGridConf()) {}
    void set_bounds(const ItemBounds&) {}
    void update_cell_color(int, int, Color) {}
    void update_text(int, int, const std::string&) {}
    void add_line(const std::vector<std::pair<int, int>>&, Color) {}
    void remove_wall_vertical(int, int) {}
    void add_wall_vertical(int, int) {}
    void remove_wall_horizontal(int, int) {}
    void add_wall_horizontal(int, int) {}

    template<typename T>
    static VisGrid from_cells(const std::vector<std::vector<T>>&) {
        return VisGrid();
    }

    std::string to_vis_string(const std::string&) const { return ""; }
};

class Vis2DPlane {
public:
    Vis2DPlane(double = 0, double = 0, std::optional<ItemBounds> = std::nullopt) {}
    void set_bounds(const ItemBounds&) {}
    void add_circle(Color, Color, double, double, double) {}
    void add_line(Color, double, double, double, double, double) {}
    void add_line_group(Color, double, const std::vector<std::pair<double, double>>&) {}
    void add_polygon(Color, Color, const std::vector<std::pair<double, double>>&) {}
    std::string to_vis_string(const std::string&) const { return ""; }
};

class VisCanvas {
public:
    VisCanvas(double = 800, double = 800) {}
    std::string to_vis_string(const std::string&) const { return ""; }
};

class VisItem {
public:
    VisItem(const VisGrid&) {}
    VisItem(const Vis2DPlane&) {}
    std::string to_vis_string(const std::string&) const { return ""; }
};

class VisFrame {
public:
    VisFrame() {}
    static VisFrame new_grid(const VisGrid&, const std::string&) { return VisFrame(); }
    static VisFrame new_2d_plane(const Vis2DPlane&, const std::string&) { return VisFrame(); }
    void set_canvas(const VisCanvas&) {}
    void set_score(const std::string&) {}
    void add_grid(const VisGrid&) {}
    void add_2d_plane(const Vis2DPlane&) {}
    void add_item(const VisItem&) {}
    void add_textarea(const VisTextArea&) {}
    void add_bar_graph(const VisBarGraph&) {}
    void enable_debug() {}
    void disable_debug() {}
    std::string to_vis_string(const std::string&) const { return ""; }
};

enum class OutputDestination {
    Stderr,
    File
};

class VisRoot {
public:
    VisRoot() {}
    explicit VisRoot(const std::string&) {}
    void add_frame(const std::string&, const VisFrame&) {}
    void add_frames(const std::string&, const std::vector<VisFrame>&) {}
    const std::vector<VisFrame>* get_frames(const std::string&) const { return nullptr; }
    void output_all() const {}
};

#endif

} // namespace ahc_vdsl
