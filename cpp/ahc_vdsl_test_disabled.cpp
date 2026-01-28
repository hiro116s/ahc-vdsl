// Test without ENABLE_VIS (zero-cost mode)
#include "ahc_vdsl.hpp"

#include <cassert>
#include <iostream>

using namespace ahc_vdsl;

void test_zero_sized() {
    // In C++, empty structs have size 1, but with optimization they should be eliminated
    std::cout << "sizeof(Color): " << sizeof(Color) << " bytes\n";
    std::cout << "sizeof(VisGrid): " << sizeof(VisGrid) << " bytes\n";
    std::cout << "sizeof(VisFrame): " << sizeof(VisFrame) << " bytes\n";
    std::cout << "sizeof(Vis2DPlane): " << sizeof(Vis2DPlane) << " bytes\n";
    std::cout << "sizeof(VisRoot): " << sizeof(VisRoot) << " bytes\n";
}

void test_operations_compile() {
    VisGrid grid(10, 10);
    grid.update_cell_color(5, 5, RED);
    std::vector<std::pair<int, int>> line = {{0, 0}, {1, 1}, {2, 2}};
    grid.add_line(line, BLUE);
    grid.remove_wall_vertical(1, 0);
    grid.remove_wall_horizontal(0, 1);

    std::string output = grid.to_vis_string("test");
    assert(output.empty());
    std::cout << "✓ test_operations_compile passed\n";
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
    plane.add_line(GREEN, 0.0, 0.0, 100.0, 100.0);
    std::vector<std::pair<double, double>> vertices = {
        {10.0, 10.0}, {90.0, 10.0}, {90.0, 90.0}, {10.0, 90.0}
    };
    plane.add_polygon(RED, YELLOW, vertices);

    std::string output = plane.to_vis_string("test");
    assert(output.empty());
    std::cout << "✓ test_vis2dplane_operations_compile passed\n";
}

void test_visframe_operations_compile() {
    VisGrid grid(3, 3);
    VisFrame frame = VisFrame::new_grid(grid, "12345");
    frame.add_textarea("Debug info");
    frame.enable_debug();
    frame.disable_debug();

    std::string output = frame.to_vis_string("test");
    assert(output.empty());
    std::cout << "✓ test_visframe_operations_compile passed\n";
}

void test_visroot_operations_compile() {
    VisRoot root;

    VisGrid grid(2, 2);
    VisFrame frame = VisFrame::new_grid(grid, "100");
    root.add_frame("main", frame);

    std::vector<VisFrame> frames;
    frames.push_back(VisFrame::new_grid(VisGrid(1, 1), "200"));
    frames.push_back(VisFrame::new_grid(VisGrid(1, 1), "300"));
    root.add_frames("main", frames);

    assert(root.get_frames("main") == nullptr);

    root.output_all();
    std::cout << "✓ test_visroot_operations_compile passed\n";
}

void test_color_constants_exist() {
    Color w = WHITE;
    Color b = BLACK;
    Color r = RED;
    (void)w; (void)b; (void)r; // suppress unused warnings
    std::cout << "✓ test_color_constants_exist passed\n";
}

void test_color_display_is_empty() {
    assert(RED.to_string().empty());
    assert(Color(128, 128, 128).to_string().empty());
    std::cout << "✓ test_color_display_is_empty passed\n";
}

int main() {
    std::cout << "Running C++ AHC VDSL Tests (DISABLED)...\n\n";

    test_zero_sized();
    std::cout << "\n";
    
    test_operations_compile();
    test_visgrid_from_cells_works();
    test_vis2dplane_operations_compile();
    test_visframe_operations_compile();
    test_visroot_operations_compile();
    test_color_constants_exist();
    test_color_display_is_empty();

    std::cout << "\n✅ All zero-cost tests passed!\n";
    return 0;
}
