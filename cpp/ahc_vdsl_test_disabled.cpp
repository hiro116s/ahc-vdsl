// Test without ENABLE_VIS (zero-cost mode)
#include "ahc_vdsl.hpp"

#include <cassert>
#include <iostream>

using namespace ahc_vdsl;

void test_zero_sized() {
    // C++ empty classes have size 1 due to the standard, but the compiler
    // eliminates them entirely when used as local variables with optimization.
    std::cout << "sizeof(Color):      " << sizeof(Color) << " bytes\n";
    std::cout << "sizeof(VisGrid):    " << sizeof(VisGrid) << " bytes\n";
    std::cout << "sizeof(Vis2DPlane): " << sizeof(Vis2DPlane) << " bytes\n";
    std::cout << "sizeof(VisFrame):   " << sizeof(VisFrame) << " bytes\n";
    std::cout << "sizeof(VisRoot):    " << sizeof(VisRoot) << " bytes\n";
}

void test_visgrid_operations_compile() {
    VisGrid grid(10, 10);
    grid.update_cell_color(5, 5, RED);
    grid.update_text(5, 5, "test");
    std::vector<std::pair<int, int>> line = {{0, 0}, {1, 1}, {2, 2}};
    grid.add_line(line, BLUE);
    grid.remove_wall_vertical(1, 0);
    grid.remove_wall_horizontal(0, 1);
    grid.add_wall_vertical(2, 0);
    grid.add_wall_horizontal(0, 2);

    std::string output = grid.to_vis_string("test");
    assert(output.empty());
    std::cout << "✓ test_visgrid_operations_compile passed\n";
}

void test_visgrid_with_bounds_compiles() {
    VisGrid grid(10, 10, ItemBounds(0.0, 0.0, 400.0, 400.0));
    std::string output = grid.to_vis_string("test");
    assert(output.empty());
    std::cout << "✓ test_visgrid_with_bounds_compiles passed\n";
}

void test_visgrid_from_cells_works() {
    std::vector<std::vector<int>> cells = {{1, 2, 3}, {4, 5, 6}};
    VisGrid grid = VisGrid::from_cells(cells);
    std::string output = grid.to_vis_string("test");
    assert(output.empty());
    std::cout << "✓ test_visgrid_from_cells_works passed\n";
}

void test_vis2dplane_operations_compile() {
    Vis2DPlane plane(100.0, 100.0);
    plane.add_circle(RED, BLUE, 50.0, 50.0, 10.0);
    plane.add_line(GREEN, 2.0, 0.0, 0.0, 100.0, 100.0);
    plane.add_line_group(RED, 1.0, {{0.0, 0.0}, {10.0, 10.0}, {20.0, 20.0}});
    std::vector<std::pair<double, double>> vertices = {
        {10.0, 10.0}, {90.0, 10.0}, {90.0, 90.0}, {10.0, 90.0}
    };
    plane.add_polygon(RED, YELLOW, vertices);
    plane.add_text(BLACK, 12.0, 50.0, 50.0, "Hello");

    std::string output = plane.to_vis_string("test");
    assert(output.empty());
    std::cout << "✓ test_vis2dplane_operations_compile passed\n";
}

void test_vis2dplane_with_bounds_compiles() {
    Vis2DPlane plane(100.0, 100.0, ItemBounds(0.0, 0.0, 400.0, 400.0));
    std::string output = plane.to_vis_string("test");
    assert(output.empty());
    std::cout << "✓ test_vis2dplane_with_bounds_compiles passed\n";
}

void test_visframe_operations_compile() {
    VisGrid grid(3, 3);
    VisTextArea ta("Info", "Debug info");
    ta.set_height(300).set_text_color("#ff0000").set_fill_color("#ffff00");

    VisFrame frame;
    frame.add_grid(grid);
    frame.add_textarea(ta);
    frame.set_score("999");
    frame.enable_debug();
    frame.disable_debug();

    std::string output = frame.to_vis_string("test");
    assert(output.empty());
    std::cout << "✓ test_visframe_operations_compile passed\n";
}

void test_visframe_with_2dplane_compiles() {
    Vis2DPlane plane(100.0, 100.0);
    VisFrame frame;
    frame.add_2d_plane(plane);
    frame.enable_debug();

    std::string output = frame.to_vis_string("test");
    assert(output.empty());
    std::cout << "✓ test_visframe_with_2dplane_compiles passed\n";
}

void test_visframe_with_canvas_compiles() {
    VisGrid grid(10, 10, ItemBounds(0.0, 0.0, 400.0, 400.0));
    VisFrame frame;
    frame.set_canvas(VisCanvas(800.0, 1000.0));
    frame.add_grid(grid);

    std::string output = frame.to_vis_string("test");
    assert(output.empty());
    std::cout << "✓ test_visframe_with_canvas_compiles passed\n";
}

void test_visroot_operations_compile() {
    VisRoot root;

    VisGrid grid(2, 2);
    VisFrame frame;
    frame.add_grid(grid);
    frame.set_score("100");
    root.add_frame("main", frame);

    std::vector<VisFrame> frames;
    {
        VisFrame f;
        f.add_grid(VisGrid(1, 1));
        f.set_score("200");
        frames.push_back(f);
    }
    {
        VisFrame f;
        f.add_grid(VisGrid(1, 1));
        f.set_score("300");
        frames.push_back(f);
    }
    root.add_frames("main", frames);

    // get_frames returns nullptr when vis is disabled
    assert(root.get_frames("main") == nullptr);

    // output_all does nothing
    root.output_all();
    std::cout << "✓ test_visroot_operations_compile passed\n";
}

void test_color_constants_exist() {
    Color w = WHITE;
    Color b = BLACK;
    Color g = GRAY;
    Color r = RED;
    Color bl = BLUE;
    Color gr = GREEN;
    Color y = YELLOW;
    Color c = CYAN;
    Color m = MAGENTA;
    (void)w; (void)b; (void)g; (void)r; (void)bl;
    (void)gr; (void)y; (void)c; (void)m;
    std::cout << "✓ test_color_constants_exist passed\n";
}

void test_color_display_is_empty() {
    assert(RED.to_string().empty());
    assert(Color(128, 128, 128).to_string().empty());
    assert(Color::from_string("#FF8800").to_string().empty());
    std::cout << "✓ test_color_display_is_empty passed\n";
}

void test_bar_graph_operations_compile() {
    VisBarGraph bg("Test", RED, 0.0, 100.0);
    bg.add_item("A", 50.0);
    bg.add_items({BarGraphItem("B", 75.0)});
    std::string output = bg.to_vis_string("test");
    assert(output.empty());
    std::cout << "✓ test_bar_graph_operations_compile passed\n";
}

void test_frame_add_bar_graph_compiles() {
    VisBarGraph bg("Test", GREEN, 0.0, 100.0);
    VisFrame frame;
    frame.add_bar_graph(bg);

    std::string output = frame.to_vis_string("test");
    assert(output.empty());
    std::cout << "✓ test_frame_add_bar_graph_compiles passed\n";
}

int main() {
    std::cout << "Running C++ AHC VDSL Tests (DISABLED)...\n\n";

    test_zero_sized();
    std::cout << "\n";

    test_visgrid_operations_compile();
    test_visgrid_with_bounds_compiles();
    test_visgrid_from_cells_works();
    test_vis2dplane_operations_compile();
    test_vis2dplane_with_bounds_compiles();
    test_visframe_operations_compile();
    test_visframe_with_2dplane_compiles();
    test_visframe_with_canvas_compiles();
    test_visroot_operations_compile();
    test_color_constants_exist();
    test_color_display_is_empty();
    test_bar_graph_operations_compile();
    test_frame_add_bar_graph_compiles();

    std::cout << "\n✅ All 13 zero-cost tests passed!\n";
    return 0;
}
