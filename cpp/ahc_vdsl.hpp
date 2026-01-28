#pragma once

#include <algorithm>
#include <cassert>
#include <cstdint>
#include <fstream>
#include <iostream>
#include <map>
#include <set>
#include <sstream>
#include <string>
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
};

// Color constants
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

    ItemBounds(double left = 0, double top = 0, double right = 800, double bottom = 800)
        : left(left), top(top), right(right), bottom(bottom) {}
};

struct VisGridConf {
    Color border_color;
    Color text_color;
    Color default_cell_color;

    VisGridConf(Color border = BLACK, Color text = BLACK, Color bg = WHITE)
        : border_color(border), text_color(text), default_cell_color(bg) {}
};

class VisGrid {
    int h, w;
    VisGridConf conf;
    std::vector<std::vector<Color>> cell_colors;
    std::vector<std::vector<std::string>> cell_texts;
    std::set<std::pair<int, int>> no_wall_vertical_pos;
    std::set<std::pair<int, int>> no_wall_horizontal_pos;
    std::vector<std::pair<std::vector<std::pair<int, int>>, Color>> lines;
    ItemBounds* bounds;

public:
    VisGrid(int h, int w, VisGridConf conf = VisGridConf())
        : h(h), w(w), conf(conf),
          cell_colors(h, std::vector<Color>(w, WHITE)),
          cell_texts(h, std::vector<std::string>(w, "")),
          bounds(nullptr) {}

    VisGrid(int h, int w, ItemBounds bounds, VisGridConf conf = VisGridConf())
        : h(h), w(w), conf(conf),
          cell_colors(h, std::vector<Color>(w, WHITE)),
          cell_texts(h, std::vector<std::string>(w, "")),
          bounds(new ItemBounds(bounds)) {}

    ~VisGrid() {
        delete bounds;
    }

    // Copy constructor
    VisGrid(const VisGrid& other)
        : h(other.h), w(other.w), conf(other.conf),
          cell_colors(other.cell_colors), cell_texts(other.cell_texts),
          no_wall_vertical_pos(other.no_wall_vertical_pos),
          no_wall_horizontal_pos(other.no_wall_horizontal_pos),
          lines(other.lines),
          bounds(other.bounds ? new ItemBounds(*other.bounds) : nullptr) {}

    // Assignment operator
    VisGrid& operator=(const VisGrid& other) {
        if (this != &other) {
            h = other.h;
            w = other.w;
            conf = other.conf;
            cell_colors = other.cell_colors;
            cell_texts = other.cell_texts;
            no_wall_vertical_pos = other.no_wall_vertical_pos;
            no_wall_horizontal_pos = other.no_wall_horizontal_pos;
            lines = other.lines;
            delete bounds;
            bounds = other.bounds ? new ItemBounds(*other.bounds) : nullptr;
        }
        return *this;
    }

    void set_bounds(const ItemBounds& b) {
        delete bounds;
        bounds = new ItemBounds(b);
    }

    void update_cell_color(int y, int x, Color color) {
        cell_colors[y][x] = color;
    }

    void add_line(const std::vector<std::pair<int, int>>& line, Color color) {
        lines.push_back({line, color});
    }

    void remove_wall_vertical(int y, int x) {
        no_wall_vertical_pos.insert({y, x});
    }

    void add_wall_vertical(int y, int x) {
        no_wall_vertical_pos.erase({y, x});
    }

    void remove_wall_horizontal(int y, int x) {
        no_wall_horizontal_pos.insert({y, x});
    }

    void add_wall_horizontal(int y, int x) {
        no_wall_horizontal_pos.erase({y, x});
    }

    template<typename T>
    static VisGrid from_cells(const std::vector<std::vector<T>>& cell_texts) {
        int h = cell_texts.size();
        int w = cell_texts[0].size();
        VisGrid grid(h, w);
        for (int i = 0; i < h; i++) {
            for (int j = 0; j < w; j++) {
                std::ostringstream oss;
                oss << cell_texts[i][j];
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
                    color_to_pos[cell_colors[y][x]].push_back({y, x});
                }
            }
        }
        ss << color_to_pos.size() << "\n";
        for (const auto& [color, positions] : color_to_pos) {
            ss << color.to_string() << " " << positions.size();
            for (const auto& [y, x] : positions) {
                ss << " " << y << " " << x;
            }
            ss << "\n";
        }

        // CELL_TEXT
        ss << "CELL_TEXT\n";
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                ss << cell_texts[y][x] << " ";
            }
            ss << "\n";
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
                    ss << (no_wall_horizontal_pos.count({y, x}) ? "N" : "Y");
                }
                ss << "\n";
            }
        }

        // WALL_VERTICAL
        if (!no_wall_vertical_pos.empty()) {
            ss << "WALL_VERTICAL\n";
            for (int y = 0; y < h; y++) {
                for (int x = 0; x <= w; x++) {
                    ss << (no_wall_vertical_pos.count({y, x}) ? "N" : "Y");
                }
                ss << "\n";
            }
        }

        return ss.str();
    }
};

class Vis2DPlane {
    double h, w;

    struct CircleGroup {
        Color stroke_color, fill_color;
        std::vector<std::tuple<double, double, double>> circles; // x, y, r
    };

    struct LineGroup {
        Color color;
        std::vector<std::tuple<double, double, double, double>> lines; // ax, ay, bx, by
    };

    struct PolygonGroup {
        Color stroke_color, fill_color;
        std::vector<std::pair<double, double>> vertices;
    };

    std::vector<CircleGroup> circle_groups;
    std::vector<LineGroup> line_groups;
    std::vector<PolygonGroup> polygon_groups;
    ItemBounds* bounds;

public:
    Vis2DPlane(double h, double w) : h(h), w(w), bounds(nullptr) {}

    Vis2DPlane(double h, double w, const ItemBounds& b)
        : h(h), w(w), bounds(new ItemBounds(b)) {}

    ~Vis2DPlane() {
        delete bounds;
    }

    // Copy constructor
    Vis2DPlane(const Vis2DPlane& other)
        : h(other.h), w(other.w),
          circle_groups(other.circle_groups),
          line_groups(other.line_groups),
          polygon_groups(other.polygon_groups),
          bounds(other.bounds ? new ItemBounds(*other.bounds) : nullptr) {}

    // Assignment operator
    Vis2DPlane& operator=(const Vis2DPlane& other) {
        if (this != &other) {
            h = other.h;
            w = other.w;
            circle_groups = other.circle_groups;
            line_groups = other.line_groups;
            polygon_groups = other.polygon_groups;
            delete bounds;
            bounds = other.bounds ? new ItemBounds(*other.bounds) : nullptr;
        }
        return *this;
    }

    void set_bounds(const ItemBounds& b) {
        delete bounds;
        bounds = new ItemBounds(b);
    }

    void add_circle(Color stroke_color, Color fill_color, double x, double y, double r) {
        circle_groups.push_back({stroke_color, fill_color, {{x, y, r}}});
    }

    void add_line(Color color, double ax, double ay, double bx, double by) {
        line_groups.push_back({color, {{ax, ay, bx, by}}});
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
            for (const auto& group : circle_groups) {
                ss << group.stroke_color.to_string() << " "
                   << group.fill_color.to_string() << " "
                   << group.circles.size();
                for (const auto& [x, y, r] : group.circles) {
                    ss << " " << x << " " << y << " " << r;
                }
                ss << "\n";
            }
        }

        // LINES
        if (!line_groups.empty()) {
            ss << "LINES\n";
            ss << line_groups.size() << "\n";
            for (const auto& group : line_groups) {
                ss << group.color.to_string() << " " << group.lines.size();
                for (const auto& [ax, ay, bx, by] : group.lines) {
                    ss << " " << ax << " " << ay << " " << bx << " " << by;
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

class VisItem {
public:
    enum Type { GRID, PLANE };

private:
    Type type;
    union {
        VisGrid* grid;
        Vis2DPlane* plane;
    };

public:
    VisItem(const VisGrid& g) : type(GRID), grid(new VisGrid(g)) {}
    VisItem(const Vis2DPlane& p) : type(PLANE), plane(new Vis2DPlane(p)) {}

    ~VisItem() {
        if (type == GRID) {
            delete grid;
        } else {
            delete plane;
        }
    }

    // Copy constructor
    VisItem(const VisItem& other) : type(other.type) {
        if (type == GRID) {
            grid = new VisGrid(*other.grid);
        } else {
            plane = new Vis2DPlane(*other.plane);
        }
    }

    // Assignment operator
    VisItem& operator=(const VisItem& other) {
        if (this != &other) {
            if (type == GRID) {
                delete grid;
            } else {
                delete plane;
            }
            type = other.type;
            if (type == GRID) {
                grid = new VisGrid(*other.grid);
            } else {
                plane = new Vis2DPlane(*other.plane);
            }
        }
        return *this;
    }

    std::string to_vis_string(const std::string& mode) const {
        if (type == GRID) {
            return grid->to_vis_string(mode);
        } else {
            return plane->to_vis_string(mode);
        }
    }
};

class VisFrame {
    VisCanvas* vis_canvas;
    std::vector<VisItem> items;
    std::string score;
    std::vector<std::string> textarea;
    bool with_debug;

public:
    VisFrame() : vis_canvas(nullptr), with_debug(false) {}

    static VisFrame new_grid(const VisGrid& grid, const std::string& score) {
        VisFrame frame;
        frame.items.push_back(VisItem(grid));
        frame.score = score;
        return frame;
    }

    static VisFrame new_2d_plane(const Vis2DPlane& plane, const std::string& score) {
        VisFrame frame;
        frame.items.push_back(VisItem(plane));
        frame.score = score;
        return frame;
    }

    ~VisFrame() {
        delete vis_canvas;
    }

    VisFrame(const VisFrame& other)
        : vis_canvas(other.vis_canvas ? new VisCanvas(*other.vis_canvas) : nullptr),
          items(other.items),
          score(other.score),
          textarea(other.textarea),
          with_debug(other.with_debug) {}

    VisFrame& operator=(const VisFrame& other) {
        if (this != &other) {
            delete vis_canvas;
            vis_canvas = other.vis_canvas ? new VisCanvas(*other.vis_canvas) : nullptr;
            items = other.items;
            score = other.score;
            textarea = other.textarea;
            with_debug = other.with_debug;
        }
        return *this;
    }

    void set_canvas(const VisCanvas& canvas) {
        delete vis_canvas;
        vis_canvas = new VisCanvas(canvas);
    }

    void add_grid(const VisGrid& grid) {
        items.push_back(VisItem(grid));
    }

    void add_2d_plane(const Vis2DPlane& plane) {
        items.push_back(VisItem(plane));
    }

    void add_item(const VisItem& item) {
        items.push_back(item);
    }

    void add_textarea(const std::string& text) {
        textarea.push_back(text);
    }

    void enable_debug() {
        with_debug = true;
    }

    void disable_debug() {
        with_debug = false;
    }

    std::string to_vis_string(const std::string& mode) const {
        std::ostringstream ss;

        // Output canvas if present
        if (vis_canvas) {
            ss << vis_canvas->to_vis_string(mode);
        }

        // Output all items
        for (const auto& item : items) {
            ss << item.to_vis_string(mode);
        }

        // SCORE
        if (!score.empty()) {
            ss << "$v(" << mode << ") SCORE " << score << "\n";
        }

        // TEXTAREA
        for (const auto& text : textarea) {
            ss << "$v(" << mode << ") TEXTAREA " << text << "\n";
        }

        // DEBUG
        if (with_debug) {
            ss << "$v(" << mode << ") DEBUG\n";
        }

        // COMMIT
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
        for (const auto& frame : frames) {
            frames_by_mode[mode].push_back(frame);
        }
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
    ItemBounds(double = 0, double = 0, double = 800, double = 800) {}
};

struct VisGridConf {
    VisGridConf(Color = BLACK, Color = BLACK, Color = WHITE) {}
};

class VisGrid {
public:
    VisGrid(int = 0, int = 0, VisGridConf = VisGridConf()) {}
    VisGrid(int, int, ItemBounds, VisGridConf = VisGridConf()) {}
    void update_cell_color(int, int, Color) {}
    void add_line(const std::vector<std::pair<int, int>>&, Color) {}
    void remove_wall_vertical(int, int) {}
    void add_wall_vertical(int, int) {}
    void remove_wall_horizontal(int, int) {}
    void add_wall_horizontal(int, int) {}
    void set_bounds(const ItemBounds&) {}

    template<typename T>
    static VisGrid from_cells(const std::vector<std::vector<T>>&) {
        return VisGrid();
    }

    std::string to_vis_string(const std::string&) const { return ""; }
};

class Vis2DPlane {
public:
    Vis2DPlane(double = 0, double = 0) {}
    Vis2DPlane(double, double, const ItemBounds&) {}
    void add_circle(Color, Color, double, double, double) {}
    void add_line(Color, double, double, double, double) {}
    void add_polygon(Color, Color, const std::vector<std::pair<double, double>>&) {}
    void set_bounds(const ItemBounds&) {}
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
    void add_grid(const VisGrid&) {}
    void add_2d_plane(const Vis2DPlane&) {}
    void add_item(const VisItem&) {}
    void add_textarea(const std::string&) {}
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
