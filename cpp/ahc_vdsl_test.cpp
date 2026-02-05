#define ENABLE_VIS
#include "ahc_vdsl.hpp"

#include <cassert>
#include <fstream>
#include <iostream>
#include <sstream>

using namespace ahc_vdsl;

static bool contains(const std::string& s, const std::string& sub) {
    return s.find(sub) != std::string::npos;
}

void test_visgrid_new() {
    VisGrid grid(3, 4);
    std::string output = grid.to_vis_string("test");

    assert(contains(output, "$v(test) GRID 3 4"));
    assert(contains(output, "CELL_COLORS_POS"));
    assert(!contains(output, "CELL_TEXT")); // All cells empty → CELL_TEXT omitted
    assert(contains(output, "LINES"));
    std::cout << "✓ test_visgrid_new passed\n";
}

void test_visgrid_with_bounds() {
    VisGrid grid(3, 4, ItemBounds(0.0, 0.0, 400.0, 400.0));
    std::string output = grid.to_vis_string("test");

    assert(contains(output, "$v(test) GRID(0, 0, 400, 400) 3 4"));
    std::cout << "✓ test_visgrid_with_bounds passed\n";
}

void test_visgrid_update_cell_color() {
    VisGrid grid(3, 3);
    grid.update_cell_color(1, 1, RED);

    std::string output = grid.to_vis_string("test");
    assert(contains(output, "#FF0000"));
    std::cout << "✓ test_visgrid_update_cell_color passed\n";
}

void test_visgrid_update_text() {
    VisGrid grid(3, 3);
    grid.update_text(1, 1, "hello");

    std::string output = grid.to_vis_string("test");
    assert(contains(output, "hello"));
    std::cout << "✓ test_visgrid_update_text passed\n";
}

void test_visgrid_cell_text_mid_empty() {
    // Mid-row empty cell is output as ""
    VisGrid grid(2, 3);
    grid.update_text(0, 0, "a");
    grid.update_text(2, 0, "c");

    std::string output = grid.to_vis_string("test");
    assert(contains(output, "CELL_TEXT"));
    // Row 0: a "" c (mid-row empty becomes "")
    assert(contains(output, "a \"\" c"));
    std::cout << "✓ test_visgrid_cell_text_mid_empty passed\n";
}

void test_visgrid_cell_text_trailing_empty() {
    // Trailing empty cells are omitted
    VisGrid grid(1, 3);
    grid.update_text(0, 0, "hello");

    std::string output = grid.to_vis_string("test");
    assert(contains(output, "CELL_TEXT"));
    // Only "hello" on the line, trailing empties omitted
    assert(contains(output, "hello\n"));
    assert(!contains(output, "hello "));
    std::cout << "✓ test_visgrid_cell_text_trailing_empty passed\n";
}

void test_visgrid_add_line() {
    VisGrid grid(5, 5);
    std::vector<std::pair<int, int>> line = {{0, 0}, {1, 1}, {2, 2}};
    grid.add_line(line, BLUE);

    std::string output = grid.to_vis_string("test");
    assert(contains(output, "LINES"));
    assert(contains(output, "#0000FF")); // BLUE
    std::cout << "✓ test_visgrid_add_line passed\n";
}

void test_visgrid_multiple_operations() {
    VisGrid grid(4, 4);
    grid.update_cell_color(0, 0, RED);
    grid.update_cell_color(3, 3, BLUE);
    grid.update_cell_color(1, 1, GREEN);
    grid.add_line({{0, 0}, {1, 0}, {2, 0}}, YELLOW);
    grid.add_line({{0, 3}, {1, 3}, {2, 3}, {3, 3}}, CYAN);

    std::string output = grid.to_vis_string("multi");

    assert(contains(output, "#FF0000")); // RED
    assert(contains(output, "#0000FF")); // BLUE
    assert(contains(output, "#00FF00")); // GREEN
    assert(contains(output, "#FFFF00")); // YELLOW
    assert(contains(output, "#00FFFF")); // CYAN
    // 2 line groups
    assert(contains(output, "LINES\n2\n"));
    std::cout << "✓ test_visgrid_multiple_operations passed\n";
}

void test_visgrid_walls() {
    VisGrid grid(2, 2);
    grid.remove_wall_vertical(1, 0);
    grid.remove_wall_horizontal(0, 1);

    std::string output = grid.to_vis_string("walls");
    assert(contains(output, "WALL_VERTICAL"));
    assert(contains(output, "WALL_HORIZONTAL"));
    std::cout << "✓ test_visgrid_walls passed\n";
}

void test_visgrid_from_cells() {
    std::vector<std::vector<int>> cells = {{1, 2, 3}, {4, 5, 6}};
    VisGrid grid = VisGrid::from_cells(cells);

    std::string output = grid.to_vis_string("test");
    assert(contains(output, "$v(test) GRID 2 3"));
    assert(contains(output, "CELL_TEXT"));
    assert(contains(output, "1 2 3"));
    assert(contains(output, "4 5 6"));
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

void test_color_from_string() {
    Color c1 = Color::from_string("#FF8800");
    assert(c1.to_string() == "#FF8800");

    Color c2 = Color::from_string("00FF00");
    assert(c2.to_string() == "#00FF00");
    std::cout << "✓ test_color_from_string passed\n";
}

void test_vis2dplane_new() {
    Vis2DPlane plane(100.0, 100.0);
    std::string output = plane.to_vis_string("test");
    assert(contains(output, "$v(test) 2D_PLANE 100 100"));
    std::cout << "✓ test_vis2dplane_new passed\n";
}

void test_vis2dplane_with_bounds() {
    Vis2DPlane plane(100.0, 100.0, ItemBounds(0.0, 0.0, 400.0, 400.0));
    std::string output = plane.to_vis_string("test");
    assert(contains(output, "$v(test) 2D_PLANE(0, 0, 400, 400) 100 100"));
    std::cout << "✓ test_vis2dplane_with_bounds passed\n";
}

void test_vis2dplane_add_circle() {
    Vis2DPlane plane(100.0, 100.0);
    plane.add_circle(RED, BLUE, 50.0, 50.0, 10.0);

    std::string output = plane.to_vis_string("test");
    assert(contains(output, "CIRCLES"));
    assert(contains(output, "#FF0000")); // RED stroke
    assert(contains(output, "#0000FF")); // BLUE fill
    assert(contains(output, "50 50 10"));
    std::cout << "✓ test_vis2dplane_add_circle passed\n";
}

void test_vis2dplane_add_line() {
    Vis2DPlane plane(100.0, 100.0);
    plane.add_line(GREEN, 2.0, 0.0, 0.0, 100.0, 100.0);

    std::string output = plane.to_vis_string("test");
    assert(contains(output, "LINES"));
    assert(contains(output, "#00FF00")); // GREEN
    assert(contains(output, "2 1 0 0 100 100")); // width=2, count=1, coords
    std::cout << "✓ test_vis2dplane_add_line passed\n";
}

void test_vis2dplane_add_polygon() {
    Vis2DPlane plane(100.0, 100.0);
    std::vector<std::pair<double, double>> vertices = {
        {10.0, 10.0}, {90.0, 10.0}, {90.0, 90.0}, {10.0, 90.0}
    };
    plane.add_polygon(RED, YELLOW, vertices);

    std::string output = plane.to_vis_string("test");
    assert(contains(output, "POLYGONS"));
    assert(contains(output, "#FF0000")); // RED stroke
    assert(contains(output, "#FFFF00")); // YELLOW fill
    assert(contains(output, "4")); // 4 vertices
    std::cout << "✓ test_vis2dplane_add_polygon passed\n";
}

void test_vis2dplane_circle_grouping() {
    // Same-color circles are grouped into one group
    Vis2DPlane plane(100.0, 100.0);
    plane.add_circle(RED, BLUE, 10.0, 10.0, 5.0);
    plane.add_circle(RED, BLUE, 20.0, 20.0, 5.0);
    plane.add_circle(RED, BLUE, 30.0, 30.0, 5.0);
    plane.add_circle(GREEN, YELLOW, 40.0, 40.0, 8.0); // Different color group

    std::string output = plane.to_vis_string("test");

    assert(contains(output, "CIRCLES"));
    // 2 groups
    assert(contains(output, "CIRCLES\n2\n"));

    // RED-BLUE group: 3 circles
    assert(contains(output, "#FF0000 #0000FF 3"));
    assert(contains(output, "10 10 5"));
    assert(contains(output, "20 20 5"));
    assert(contains(output, "30 30 5"));

    // GREEN-YELLOW group: 1 circle
    assert(contains(output, "#00FF00 #FFFF00 1"));
    assert(contains(output, "40 40 8"));
    std::cout << "✓ test_vis2dplane_circle_grouping passed\n";
}

void test_vis2dplane_line_grouping() {
    // Same color+width lines are grouped into one group
    Vis2DPlane plane(100.0, 100.0);
    plane.add_line(RED, 2.0, 0.0, 0.0, 10.0, 10.0);
    plane.add_line(RED, 2.0, 10.0, 10.0, 20.0, 20.0);
    plane.add_line(RED, 2.0, 20.0, 20.0, 30.0, 30.0);
    plane.add_line(BLUE, 3.0, 40.0, 40.0, 50.0, 50.0); // Different color

    std::string output = plane.to_vis_string("test");

    assert(contains(output, "LINES"));
    // 2 groups
    assert(contains(output, "LINES\n2\n"));

    // RED-width2 group: 3 segments
    assert(contains(output, "#FF0000 2 3"));
    // BLUE-width3 group: 1 segment
    assert(contains(output, "#0000FF 3 1"));
    assert(contains(output, "40 40 50 50"));
    std::cout << "✓ test_vis2dplane_line_grouping passed\n";
}

void test_visframe_new() {
    VisFrame frame;
    frame.set_score("12345");
    VisTextArea ta("Info", "Debug info");
    frame.add_textarea(ta);

    std::string output = frame.to_vis_string("test");
    assert(contains(output, "$v(test) SCORE 12345"));
    assert(contains(output, "$v(test) TEXTAREA Info 200 #000000 #ffffff Debug info"));
    assert(contains(output, "$v(test) COMMIT"));
    std::cout << "✓ test_visframe_new passed\n";
}

void test_visframe_with_grid() {
    VisGrid grid(3, 3);
    VisFrame frame;
    frame.add_grid(grid);
    frame.set_score("12345");
    VisTextArea ta("Title", "Debug info");
    frame.add_textarea(ta);

    std::string output = frame.to_vis_string("test");
    assert(contains(output, "$v(test) GRID 3 3"));
    assert(contains(output, "$v(test) SCORE 12345"));
    assert(contains(output, "$v(test) TEXTAREA Title 200 #000000 #ffffff Debug info"));
    assert(contains(output, "$v(test) COMMIT"));
    std::cout << "✓ test_visframe_with_grid passed\n";
}

void test_textarea_basic() {
    VisTextArea ta("Info", "Some debug information");
    VisFrame frame;
    frame.add_textarea(ta);

    std::string output = frame.to_vis_string("test");
    assert(contains(output, "$v(test) TEXTAREA Info 200 #000000 #ffffff Some debug information"));
    std::cout << "✓ test_textarea_basic passed\n";
}

void test_textarea_custom() {
    VisTextArea ta("CustomInfo", "Custom message");
    ta.set_height(300).set_text_color("#ff0000").set_fill_color("#ffff00");

    VisFrame frame;
    frame.add_textarea(ta);

    std::string output = frame.to_vis_string("test");
    assert(contains(output, "$v(test) TEXTAREA CustomInfo 300 #ff0000 #ffff00 Custom message"));
    std::cout << "✓ test_textarea_custom passed\n";
}

void test_textarea_empty_text() {
    VisTextArea ta("EmptyInfo", "");

    VisFrame frame;
    frame.add_textarea(ta);

    std::string output = frame.to_vis_string("test");
    assert(contains(output, "$v(test) TEXTAREA EmptyInfo 200 #000000 #ffffff \"\""));
    std::cout << "✓ test_textarea_empty_text passed\n";
}

void test_visframe_with_2dplane() {
    Vis2DPlane plane(100.0, 100.0);
    plane.add_circle(RED, BLUE, 50.0, 50.0, 10.0);

    VisFrame frame;
    frame.add_2d_plane(plane);
    frame.enable_debug();

    std::string output = frame.to_vis_string("test");
    assert(contains(output, "$v(test) 2D_PLANE 100 100"));
    assert(contains(output, "$v(test) DEBUG"));
    assert(contains(output, "$v(test) COMMIT"));
    std::cout << "✓ test_visframe_with_2dplane passed\n";
}

void test_visframe_with_canvas() {
    VisGrid grid1(10, 10, ItemBounds(0.0, 0.0, 400.0, 400.0));
    VisGrid grid2(5, 5, ItemBounds(500.0, 0.0, 900.0, 400.0));

    VisFrame frame;
    frame.set_canvas(VisCanvas(800.0, 1000.0));
    frame.add_grid(grid1);
    frame.add_grid(grid2);
    frame.set_score("999");

    std::string output = frame.to_vis_string("test");
    assert(contains(output, "$v(test) CANVAS 800 1000"));
    assert(contains(output, "$v(test) GRID(0, 0, 400, 400) 10 10"));
    assert(contains(output, "$v(test) GRID(500, 0, 900, 400) 5 5"));
    assert(contains(output, "$v(test) SCORE 999"));
    assert(contains(output, "$v(test) COMMIT"));
    std::cout << "✓ test_visframe_with_canvas passed\n";
}

void test_visroot_add_frame() {
    VisRoot root;

    {
        VisGrid grid(2, 2);
        VisFrame frame;
        frame.add_grid(grid);
        frame.set_score("100");
        root.add_frame("main", frame);
    }

    {
        VisGrid grid(2, 2);
        grid.update_cell_color(0, 0, RED);
        VisFrame frame;
        frame.add_grid(grid);
        frame.set_score("200");
        root.add_frame("main", frame);
    }

    const auto* frames = root.get_frames("main");
    assert(frames != nullptr);
    assert(frames->size() == 2);
    assert(contains((*frames)[0].to_vis_string("main"), "SCORE 100"));
    assert(contains((*frames)[1].to_vis_string("main"), "SCORE 200"));
    std::cout << "✓ test_visroot_add_frame passed\n";
}

void test_visroot_multiple_modes() {
    VisRoot root;

    {
        VisGrid grid(1, 1);
        VisFrame frame;
        frame.add_grid(grid);
        frame.set_score("100");
        root.add_frame("main", frame);
    }

    {
        VisGrid grid(1, 1);
        VisTextArea ta("Debug", "Debug message");
        VisFrame frame;
        frame.add_grid(grid);
        frame.add_textarea(ta);
        root.add_frame("debug", frame);
    }

    assert(root.get_frames("main") != nullptr);
    assert(root.get_frames("main")->size() == 1);
    assert(root.get_frames("debug") != nullptr);
    assert(root.get_frames("debug")->size() == 1);
    std::cout << "✓ test_visroot_multiple_modes passed\n";
}

void test_visroot_add_frames() {
    VisRoot root;

    std::vector<VisFrame> frames_to_add;
    for (int score : {100, 200, 300}) {
        VisGrid grid(1, 1);
        VisFrame frame;
        frame.add_grid(grid);
        frame.set_score(std::to_string(score));
        frames_to_add.push_back(frame);
    }

    root.add_frames("main", frames_to_add);

    const auto* frames = root.get_frames("main");
    assert(frames != nullptr);
    assert(frames->size() == 3);
    assert(contains((*frames)[0].to_vis_string("main"), "SCORE 100"));
    assert(contains((*frames)[1].to_vis_string("main"), "SCORE 200"));
    assert(contains((*frames)[2].to_vis_string("main"), "SCORE 300"));
    std::cout << "✓ test_visroot_add_frames passed\n";
}

void test_visroot_file_output() {
    std::string test_file = "/tmp/vis_test_output.txt";
    std::remove(test_file.c_str());

    {
        VisRoot root(test_file);

        VisGrid grid(2, 2);
        grid.update_cell_color(0, 0, RED);
        VisFrame frame;
        frame.add_grid(grid);
        frame.set_score("12345");
        root.add_frame("test", frame);

        root.output_all();
    }

    std::ifstream ifs(test_file);
    assert(ifs.good());
    std::stringstream buffer;
    buffer << ifs.rdbuf();
    std::string contents = buffer.str();

    assert(contains(contents, "$v(test) GRID 2 2"));
    assert(contains(contents, "SCORE 12345"));
    assert(contains(contents, "#FF0000")); // RED
    assert(contains(contents, "$v(test) COMMIT"));

    std::remove(test_file.c_str());
    std::cout << "✓ test_visroot_file_output passed\n";
}

void test_visroot_file_output_multiple_modes() {
    std::string test_file = "/tmp/vis_test_multi_mode.txt";
    std::remove(test_file.c_str());

    {
        VisRoot root(test_file);

        {
            VisGrid grid(1, 1);
            VisFrame frame;
            frame.add_grid(grid);
            frame.set_score("100");
            root.add_frame("main", frame);
        }

        {
            Vis2DPlane plane(50.0, 50.0);
            plane.add_circle(RED, BLUE, 25.0, 25.0, 5.0);
            VisFrame frame;
            frame.add_2d_plane(plane);
            frame.set_score("200");
            root.add_frame("debug", frame);
        }

        root.output_all();
    }

    std::ifstream ifs(test_file);
    assert(ifs.good());
    std::stringstream buffer;
    buffer << ifs.rdbuf();
    std::string contents = buffer.str();

    assert(contains(contents, "$v(main) GRID 1 1"));
    assert(contains(contents, "SCORE 100"));
    assert(contains(contents, "$v(debug) 2D_PLANE 50 50"));
    assert(contains(contents, "SCORE 200"));

    std::remove(test_file.c_str());
    std::cout << "✓ test_visroot_file_output_multiple_modes passed\n";
}

void test_bar_graph_basic() {
    VisBarGraph bg(BLUE, 0.0, 100.0);
    bg.add_item("A", 50.0);
    bg.add_item("B", 75.0);

    std::string output = bg.to_vis_string("test");
    assert(contains(output, "$v(test) BAR_GRAPH #0000FF 0 100"));
    assert(contains(output, "2 A 50 B 75"));
    std::cout << "✓ test_bar_graph_basic passed\n";
}

void test_bar_graph_add_items() {
    std::vector<BarGraphItem> items = {
        BarGraphItem("X", -5.0),
        BarGraphItem("Y", 0.0),
        BarGraphItem("Z", 7.5)
    };

    VisBarGraph bg(RED, -10.0, 10.0);
    bg.add_items(items);

    std::string output = bg.to_vis_string("test");
    assert(contains(output, "$v(test) BAR_GRAPH #FF0000 -10 10"));
    assert(contains(output, "3 X -5 Y 0 Z 7.5"));
    std::cout << "✓ test_bar_graph_add_items passed\n";
}

void test_frame_add_bar_graph() {
    VisBarGraph bg(GREEN, 0.0, 200.0);
    bg.add_item("Item1", 100.0);
    bg.add_item("Item2", 150.0);

    VisFrame frame;
    frame.add_bar_graph(bg);
    frame.set_score("12345");

    std::string output = frame.to_vis_string("main");
    assert(contains(output, "$v(main) BAR_GRAPH #00FF00 0 200"));
    assert(contains(output, "2 Item1 100 Item2 150"));
    assert(contains(output, "$v(main) SCORE 12345"));
    assert(contains(output, "$v(main) COMMIT"));
    std::cout << "✓ test_frame_add_bar_graph passed\n";
}

void test_bar_graph_item_new() {
    BarGraphItem item("TestLabel", 42.5);
    assert(item.label == "TestLabel");
    assert(item.value == 42.5);
    std::cout << "✓ test_bar_graph_item_new passed\n";
}

int main() {
    std::cout << "Running C++ AHC VDSL Tests (ENABLE_VIS)...\n\n";

    test_visgrid_new();
    test_visgrid_with_bounds();
    test_visgrid_update_cell_color();
    test_visgrid_update_text();
    test_visgrid_cell_text_mid_empty();
    test_visgrid_cell_text_trailing_empty();
    test_visgrid_add_line();
    test_visgrid_multiple_operations();
    test_visgrid_walls();
    test_visgrid_from_cells();
    test_color_display();
    test_color_from_string();
    test_vis2dplane_new();
    test_vis2dplane_with_bounds();
    test_vis2dplane_add_circle();
    test_vis2dplane_add_line();
    test_vis2dplane_add_polygon();
    test_vis2dplane_circle_grouping();
    test_vis2dplane_line_grouping();
    test_visframe_new();
    test_visframe_with_grid();
    test_textarea_basic();
    test_textarea_custom();
    test_textarea_empty_text();
    test_visframe_with_2dplane();
    test_visframe_with_canvas();
    test_visroot_add_frame();
    test_visroot_multiple_modes();
    test_visroot_add_frames();
    test_visroot_file_output();
    test_visroot_file_output_multiple_modes();
    test_bar_graph_basic();
    test_bar_graph_add_items();
    test_frame_add_bar_graph();
    test_bar_graph_item_new();

    std::cout << "\n✅ All 34 tests passed!\n";
    return 0;
}
