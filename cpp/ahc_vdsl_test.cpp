#define ENABLE_VIS
#include "ahc_vdsl.hpp"

#include <cassert>
#include <fstream>
#include <iostream>
#include <sstream>

using namespace ahc_vdsl;

void test_visgrid_new() {
    VisGrid grid(3, 4);
    std::string output = grid.to_vis_string("test");

    assert(output.find("$v(test) GRID 3 4") != std::string::npos);
    assert(output.find("CELL_COLORS_POS") != std::string::npos);
    assert(output.find("CELL_TEXT") != std::string::npos);
    assert(output.find("LINES") != std::string::npos);
    std::cout << "✓ test_visgrid_new passed\n";
}

void test_visgrid_update_cell_color() {
    VisGrid grid(3, 3);
    grid.update_cell_color(1, 1, RED);

    std::string output = grid.to_vis_string("test");
    assert(output.find("#FF0000") != std::string::npos);
    std::cout << "✓ test_visgrid_update_cell_color passed\n";
}

void test_visgrid_add_line() {
    VisGrid grid(5, 5);
    std::vector<std::pair<int, int>> line = {{0, 0}, {1, 1}, {2, 2}};
    grid.add_line(line, BLUE);

    std::string output = grid.to_vis_string("test");
    assert(output.find("LINES") != std::string::npos);
    assert(output.find("#0000FF") != std::string::npos); // BLUE
    std::cout << "✓ test_visgrid_add_line passed\n";
}

void test_visgrid_from_cells() {
    std::vector<std::vector<int>> cells = {{1, 2, 3}, {4, 5, 6}};
    VisGrid grid = VisGrid::from_cells(cells);

    std::string output = grid.to_vis_string("test");
    assert(output.find("$v(test) GRID 2 3") != std::string::npos);
    assert(output.find("1 ") != std::string::npos);
    assert(output.find("2 ") != std::string::npos);
    assert(output.find("3 ") != std::string::npos);
    std::cout << "✓ test_visgrid_from_cells passed\n";
}

void test_color_display() {
    assert(WHITE.to_string() == "#FFFFFF");
    assert(BLACK.to_string() == "#000000");
    assert(RED.to_string() == "#FF0000");
    assert(GREEN.to_string() == "#00FF00");
    assert(BLUE.to_string() == "#0000FF");
    assert(YELLOW.to_string() == "#FFFF00");
    assert(CYAN.to_string() == "#00FFFF");
    assert(MAGENTA.to_string() == "#FF00FF");
    std::cout << "✓ test_color_display passed\n";
}

void test_visgrid_walls() {
    VisGrid grid(2, 2);
    grid.remove_wall_vertical(1, 0);
    grid.remove_wall_horizontal(0, 1);
    std::string output = grid.to_vis_string("walls");
    assert(output.find("WALL_VERTICAL") != std::string::npos);
    assert(output.find("WALL_HORIZONTAL") != std::string::npos);
    std::cout << "✓ test_visgrid_walls passed\n";
}

void test_vis2dplane_new() {
    Vis2DPlane plane(100.0, 100.0);
    std::string output = plane.to_vis_string("test");
    assert(output.find("$v(test) 2D_PLANE 100 100") != std::string::npos);
    std::cout << "✓ test_vis2dplane_new passed\n";
}

void test_vis2dplane_add_circle() {
    Vis2DPlane plane(100.0, 100.0);
    plane.add_circle(RED, BLUE, 50.0, 50.0, 10.0);
    std::string output = plane.to_vis_string("test");
    assert(output.find("CIRCLES") != std::string::npos);
    assert(output.find("#FF0000") != std::string::npos); // RED stroke
    assert(output.find("#0000FF") != std::string::npos); // BLUE fill
    assert(output.find("50 50 10") != std::string::npos);
    std::cout << "✓ test_vis2dplane_add_circle passed\n";
}

void test_vis2dplane_add_line() {
    Vis2DPlane plane(100.0, 100.0);
    plane.add_line(GREEN, 0.0, 0.0, 100.0, 100.0);
    std::string output = plane.to_vis_string("test");
    assert(output.find("LINES") != std::string::npos);
    assert(output.find("#00FF00") != std::string::npos); // GREEN
    assert(output.find("0 0 100 100") != std::string::npos);
    std::cout << "✓ test_vis2dplane_add_line passed\n";
}

void test_vis2dplane_add_polygon() {
    Vis2DPlane plane(100.0, 100.0);
    std::vector<std::pair<double, double>> vertices = {
        {10.0, 10.0}, {90.0, 10.0}, {90.0, 90.0}, {10.0, 90.0}
    };
    plane.add_polygon(RED, YELLOW, vertices);
    std::string output = plane.to_vis_string("test");
    assert(output.find("POLYGONS") != std::string::npos);
    assert(output.find("#FF0000") != std::string::npos); // RED stroke
    assert(output.find("#FFFF00") != std::string::npos); // YELLOW fill
    std::cout << "✓ test_vis2dplane_add_polygon passed\n";
}

void test_visframe_with_grid() {
    VisGrid grid(3, 3);
    VisFrame frame = VisFrame::new_grid(grid, "12345");
    frame.add_textarea("Debug info");

    std::string output = frame.to_vis_string("test");
    assert(output.find("$v(test) GRID 3 3") != std::string::npos);
    assert(output.find("$v(test) SCORE 12345") != std::string::npos);
    assert(output.find("$v(test) TEXTAREA Debug info") != std::string::npos);
    assert(output.find("$v(test) COMMIT") != std::string::npos);
    std::cout << "✓ test_visframe_with_grid passed\n";
}

void test_visframe_with_2dplane() {
    Vis2DPlane plane(100.0, 100.0);
    plane.add_circle(RED, BLUE, 50.0, 50.0, 10.0);
    VisFrame frame = VisFrame::new_2d_plane(plane, "");
    frame.enable_debug();

    std::string output = frame.to_vis_string("test");
    assert(output.find("$v(test) 2D_PLANE 100 100") != std::string::npos);
    assert(output.find("$v(test) DEBUG") != std::string::npos);
    assert(output.find("$v(test) COMMIT") != std::string::npos);
    std::cout << "✓ test_visframe_with_2dplane passed\n";
}

void test_visroot_add_frame() {
    VisRoot root;

    {
        VisGrid grid(2, 2);
        VisFrame frame = VisFrame::new_grid(grid, "100");
        root.add_frame("main", frame);
    }

    {
        VisGrid grid(2, 2);
        grid.update_cell_color(0, 0, RED);
        VisFrame frame = VisFrame::new_grid(grid, "200");
        root.add_frame("main", frame);
    }

    const auto* frames = root.get_frames("main");
    assert(frames != nullptr);
    assert(frames->size() == 2);
    assert((*frames)[0].to_vis_string("main").find("SCORE 100") != std::string::npos);
    assert((*frames)[1].to_vis_string("main").find("SCORE 200") != std::string::npos);
    std::cout << "✓ test_visroot_add_frame passed\n";
}

void test_visroot_file_output() {
    std::string test_file = "/tmp/vis_test_output.txt";

    // Clean up if exists
    std::remove(test_file.c_str());

    {
        VisRoot root(test_file);

        VisGrid grid(2, 2);
        grid.update_cell_color(0, 0, RED);
        VisFrame frame = VisFrame::new_grid(grid, "12345");
        root.add_frame("test", frame);

        root.output_all();
    }

    // Read and verify
    std::ifstream ifs(test_file);
    assert(ifs.good());
    std::stringstream buffer;
    buffer << ifs.rdbuf();
    std::string contents = buffer.str();

    assert(contents.find("$v(test) GRID 2 2") != std::string::npos);
    assert(contents.find("SCORE 12345") != std::string::npos);
    assert(contents.find("#FF0000") != std::string::npos); // RED
    assert(contents.find("$v(test) COMMIT") != std::string::npos);

    std::remove(test_file.c_str());
    std::cout << "✓ test_visroot_file_output passed\n";
}

void test_visroot_file_output_multiple_modes() {
    std::string test_file = "/tmp/vis_test_multi_mode.txt";

    std::remove(test_file.c_str());

    {
        VisRoot root(test_file);

        VisGrid grid(1, 1);
        VisFrame frame1 = VisFrame::new_grid(grid, "100");
        root.add_frame("main", frame1);

        Vis2DPlane plane(50.0, 50.0);
        plane.add_circle(RED, BLUE, 25.0, 25.0, 5.0);
        VisFrame frame2 = VisFrame::new_2d_plane(plane, "200");
        root.add_frame("debug", frame2);

        root.output_all();
    }

    std::ifstream ifs(test_file);
    assert(ifs.good());
    std::stringstream buffer;
    buffer << ifs.rdbuf();
    std::string contents = buffer.str();

    assert(contents.find("$v(main) GRID 1 1") != std::string::npos);
    assert(contents.find("SCORE 100") != std::string::npos);
    assert(contents.find("$v(debug) 2D_PLANE 50 50") != std::string::npos);
    assert(contents.find("SCORE 200") != std::string::npos);

    std::remove(test_file.c_str());
    std::cout << "✓ test_visroot_file_output_multiple_modes passed\n";
}

int main() {
    std::cout << "Running C++ AHC VDSL Tests (ENABLE_VIS)...\n\n";

    test_visgrid_new();
    test_visgrid_update_cell_color();
    test_visgrid_add_line();
    test_visgrid_from_cells();
    test_color_display();
    test_visgrid_walls();
    test_vis2dplane_new();
    test_vis2dplane_add_circle();
    test_vis2dplane_add_line();
    test_vis2dplane_add_polygon();
    test_visframe_with_grid();
    test_visframe_with_2dplane();
    test_visroot_add_frame();
    test_visroot_file_output();
    test_visroot_file_output_multiple_modes();

    std::cout << "\n✅ All tests passed!\n";
    return 0;
}
