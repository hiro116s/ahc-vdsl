// Tests for vis feature enabled
#[cfg(feature = "vis")]
use super::ahc_vdsl::ahc_vdsl::*;

#[cfg(feature = "vis")]
#[test]
fn test_visgrid_new() {
    let grid = VisGrid::new(3, 4);
    let output = grid.to_vis_string("test");

    assert!(output.contains("$v(test) GRID 3 4"));
    assert!(output.contains("CELL_COLORS_POS"));
    assert!(output.contains("CELL_TEXT"));
    assert!(output.contains("LINES"));
}

#[cfg(feature = "vis")]
#[test]
fn test_visgrid_update_cell_color() {
    let mut grid = VisGrid::new(3, 3);
    grid.update_cell_color((1, 1), RED);

    let output = grid.to_vis_string("test");
    assert!(output.contains("#FF0000"));
}

#[cfg(feature = "vis")]
#[test]
fn test_visgrid_add_line() {
    let mut grid = VisGrid::new(5, 5);
    grid.add_line(vec![(0, 0), (1, 1), (2, 2)], BLUE);

    let output = grid.to_vis_string("test");
    assert!(output.contains("LINES"));
    assert!(output.contains("1")); // 1 line
    assert!(output.contains("#0000FF")); // BLUE color
}

#[cfg(feature = "vis")]
#[test]
fn test_visgrid_from_cells() {
    let cells = vec![vec![1, 2, 3], vec![4, 5, 6]];
    let grid = VisGrid::from_cells(&cells);

    let output = grid.to_vis_string("test");
    assert!(output.contains("$v(test) GRID 2 3"));
    assert!(output.contains("1 2 3"));
    assert!(output.contains("4 5 6"));
}

#[cfg(feature = "vis")]
#[test]
fn test_color_display() {
    assert_eq!(WHITE.to_string(), "#FFFFFF");
    assert_eq!(BLACK.to_string(), "#000000");
    assert_eq!(RED.to_string(), "#FF0000");
    assert_eq!(GREEN.to_string(), "#00FF00");
    assert_eq!(BLUE.to_string(), "#0000FF");
    assert_eq!(YELLOW.to_string(), "#FFFF00");
    assert_eq!(CYAN.to_string(), "#00FFFF");
    assert_eq!(MAGENTA.to_string(), "#FF00FF");
}

#[cfg(feature = "vis")]
#[test]
fn test_visgrid_multiple_operations() {
    let mut grid = VisGrid::new(4, 4);

    // Update multiple cell colors
    grid.update_cell_color((0, 0), RED);
    grid.update_cell_color((3, 3), BLUE);
    grid.update_cell_color((1, 1), GREEN);

    // Add multiple lines
    grid.add_line(vec![(0, 0), (1, 0), (2, 0)], YELLOW);
    grid.add_line(vec![(0, 3), (1, 3), (2, 3), (3, 3)], CYAN);

    let output = grid.to_vis_string("multi");

    // Check that all colors are present
    assert!(output.contains("#FF0000")); // RED
    assert!(output.contains("#0000FF")); // BLUE
    assert!(output.contains("#00FF00")); // GREEN
    assert!(output.contains("#FFFF00")); // YELLOW
    assert!(output.contains("#00FFFF")); // CYAN

    // Check that we have 2 lines
    let lines_section = output.split("LINES").nth(1).unwrap();
    assert!(lines_section.trim().starts_with("2"));
}

// Add tests for walls
#[cfg(feature = "vis")]
#[test]
fn test_visgrid_walls() {
    let mut grid = VisGrid::new(2, 2);
    grid.remove_wall_vertical((1, 0));
    grid.remove_wall_horizontal((0, 1));
    let output = grid.to_vis_string("walls");
    assert!(output.contains("WALL_VERTICAL"));
    assert!(output.contains("WALL_HORIZONTAL"));
    eprintln!("{output}");
}

#[cfg(feature = "vis")]
#[test]
fn test_vis2dplane_new() {
    let plane = Vis2DPlane::new(100.0, 100.0);
    let output = plane.to_vis_string("test");
    assert!(output.contains("$v(test) 2D_PLANE 100 100"));
}

#[cfg(feature = "vis")]
#[test]
fn test_vis2dplane_add_circle() {
    let mut plane = Vis2DPlane::new(100.0, 100.0);
    plane.add_circle(RED, BLUE, 50.0, 50.0, 10.0);
    let output = plane.to_vis_string("test");
    assert!(output.contains("CIRCLES"));
    assert!(output.contains("#FF0000")); // RED stroke
    assert!(output.contains("#0000FF")); // BLUE fill
    assert!(output.contains("50 50 10"));
}

#[cfg(feature = "vis")]
#[test]
fn test_vis2dplane_add_line() {
    let mut plane = Vis2DPlane::new(100.0, 100.0);
    plane.add_line(GREEN, 0.0, 0.0, 100.0, 100.0);
    let output = plane.to_vis_string("test");
    assert!(output.contains("LINES"));
    assert!(output.contains("#00FF00")); // GREEN
    assert!(output.contains("0 0 100 100"));
}

#[cfg(feature = "vis")]
#[test]
fn test_vis2dplane_add_polygon() {
    let mut plane = Vis2DPlane::new(100.0, 100.0);
    plane.add_polygon(
        RED,
        YELLOW,
        vec![(10.0, 10.0), (90.0, 10.0), (90.0, 90.0), (10.0, 90.0)],
    );
    let output = plane.to_vis_string("test");
    assert!(output.contains("POLYGONS"));
    assert!(output.contains("#FF0000")); // RED stroke
    assert!(output.contains("#FFFF00")); // YELLOW fill
    assert!(output.contains("4")); // 4 vertices
}

#[cfg(feature = "vis")]
#[test]
fn test_visframe_with_grid() {
    let grid = VisGrid::new(3, 3);
    let mut frame = VisFrame::new_grid(grid, "12345");
    frame.add_textarea("Debug info".to_string());

    let output = frame.to_vis_string("test");
    assert!(output.contains("$v(test) GRID 3 3"));
    assert!(output.contains("$v(test) SCORE 12345"));
    assert!(output.contains("$v(test) TEXTAREA Debug info"));
    assert!(output.contains("$v(test) COMMIT"));
}

#[cfg(feature = "vis")]
#[test]
fn test_visframe_with_2dplane() {
    let mut plane = Vis2DPlane::new(100.0, 100.0);
    plane.add_circle(RED, BLUE, 50.0, 50.0, 10.0);
    let mut frame = VisFrame::new_2d_plane(plane, "");
    frame.enable_debug();

    let output = frame.to_vis_string("test");
    assert!(output.contains("$v(test) 2D_PLANE 100 100"));
    assert!(output.contains("$v(test) DEBUG"));
    assert!(output.contains("$v(test) COMMIT"));
}

#[cfg(feature = "vis")]
#[test]
fn test_visroot_add_frame() {
    let mut root = VisRoot::new();

    // Create first frame
    {
        let grid = VisGrid::new(2, 2);
        let frame = VisFrame::new_grid(grid, "100");
        root.add_frame("main", frame);
    }

    // Create second frame
    {
        let mut grid = VisGrid::new(2, 2);
        grid.update_cell_color((0, 0), RED);
        let frame = VisFrame::new_grid(grid, "200");
        root.add_frame("main", frame);
    }

    let frames = root.get_frames("main").unwrap();
    assert_eq!(frames.len(), 2);
    let output0 = frames[0].to_vis_string("main");
    let output1 = frames[1].to_vis_string("main");
    assert!(output0.contains("SCORE 100"));
    assert!(output1.contains("SCORE 200"));
}

#[cfg(feature = "vis")]
#[test]
fn test_visroot_multiple_modes() {
    let mut root = VisRoot::new();

    // Main mode
    {
        let grid = VisGrid::new(1, 1);
        let frame = VisFrame::new_grid(grid, "100");
        root.add_frame("main", frame);
    }

    // Debug mode
    {
        let grid = VisGrid::new(1, 1);
        let mut frame = VisFrame::new_grid(grid, "");
        frame.add_textarea("Debug message".to_string());
        root.add_frame("debug", frame);
    }

    assert_eq!(root.get_frames("main").unwrap().len(), 1);
    assert_eq!(root.get_frames("debug").unwrap().len(), 1);
}

#[cfg(feature = "vis")]
#[test]
fn test_visroot_add_frames() {
    let mut root = VisRoot::new();

    let frame1 = VisFrame::new_grid(VisGrid::new(1, 1), "100");
    let frame2 = VisFrame::new_grid(VisGrid::new(1, 1), "200");
    let frame3 = VisFrame::new_grid(VisGrid::new(1, 1), "300");

    root.add_frames("main", vec![frame1, frame2, frame3]);

    let frames = root.get_frames("main").unwrap();
    assert_eq!(frames.len(), 3);
    assert!(frames[0].to_vis_string("main").contains("SCORE 100"));
    assert!(frames[1].to_vis_string("main").contains("SCORE 200"));
    assert!(frames[2].to_vis_string("main").contains("SCORE 300"));
}

#[cfg(feature = "vis")]
#[test]
fn test_visroot_file_output() {
    use std::fs;

    // Create a temporary file path
    let temp_dir = std::env::temp_dir();
    let test_file = temp_dir.join("vis_test_output.txt");

    // Clean up if file exists
    let _ = fs::remove_file(&test_file);

    // Create VisRoot with file output
    let mut root = VisRoot::new_with_file(&test_file);

    // Add some frames
    let mut grid = VisGrid::new(2, 2);
    grid.update_cell_color((0, 0), RED);
    let frame = VisFrame::new_grid(grid, "12345");
    root.add_frame("test", frame);

    // Output to file
    root.output_all();

    // Read the file and verify contents
    let contents = fs::read_to_string(&test_file).expect("Failed to read output file");

    assert!(contents.contains("$v(test) GRID 2 2"));
    assert!(contents.contains("SCORE 12345"));
    assert!(contents.contains("#FF0000")); // RED color
    assert!(contents.contains("$v(test) COMMIT"));

    // Clean up
    let _ = fs::remove_file(&test_file);
}

#[cfg(feature = "vis")]
#[test]
fn test_visroot_file_output_multiple_modes() {
    use std::fs;

    let temp_dir = std::env::temp_dir();
    let test_file = temp_dir.join("vis_test_multi_mode.txt");

    let _ = fs::remove_file(&test_file);

    let mut root = VisRoot::new_with_file(&test_file);

    // Add frames to different modes
    let grid1 = VisGrid::new(1, 1);
    let frame1 = VisFrame::new_grid(grid1, "100");
    root.add_frame("main", frame1);

    let mut plane = Vis2DPlane::new(50.0, 50.0);
    plane.add_circle(RED, BLUE, 25.0, 25.0, 5.0);
    let frame2 = VisFrame::new_2d_plane(plane, "200");
    root.add_frame("debug", frame2);

    root.output_all();

    let contents = fs::read_to_string(&test_file).expect("Failed to read output file");

    // Verify both modes are in the output
    assert!(contents.contains("$v(main) GRID 1 1"));
    assert!(contents.contains("SCORE 100"));
    assert!(contents.contains("$v(debug) 2D_PLANE 50 50"));
    assert!(contents.contains("SCORE 200"));

    let _ = fs::remove_file(&test_file);
}

// ============================================================
// Tests for vis feature DISABLED (zero-cost mode)
// ============================================================
#[cfg(not(feature = "vis"))]
mod vis_disabled_tests {
    use crate::ahc_vdsl::ahc_vdsl::*;

    #[test]
    fn test_visgrid_is_zero_sized() {
        // VisGrid should be zero-sized when vis is disabled
        assert_eq!(std::mem::size_of::<VisGrid>(), 0);
    }

    #[test]
    fn test_visframe_is_zero_sized() {
        // VisFrame should be zero-sized when vis is disabled
        assert_eq!(std::mem::size_of::<VisFrame>(), 0);
    }

    #[test]
    fn test_vis2dplane_is_zero_sized() {
        // Vis2DPlane should be zero-sized when vis is disabled
        assert_eq!(std::mem::size_of::<Vis2DPlane>(), 0);
    }

    #[test]
    fn test_visroot_is_zero_sized() {
        // VisRoot should be zero-sized when vis is disabled
        assert_eq!(std::mem::size_of::<VisRoot>(), 0);
    }

    #[test]
    fn test_color_is_zero_sized() {
        // Color should be zero-sized when vis is disabled
        assert_eq!(std::mem::size_of::<Color>(), 0);
    }

    #[test]
    fn test_visgrid_operations_compile() {
        // Verify that all operations compile and run without errors
        let mut grid = VisGrid::new(10, 10);
        grid.update_cell_color((5, 5), RED);
        grid.add_line(vec![(0, 0), (1, 1), (2, 2)], BLUE);
        grid.remove_wall_vertical((1, 0));
        grid.remove_wall_horizontal((0, 1));
        grid.add_wall_vertical((2, 0));
        grid.add_wall_horizontal((0, 2));

        let output = grid.to_vis_string("test");
        assert!(output.is_empty()); // Output should be empty when vis is disabled
    }

    #[test]
    fn test_visgrid_from_cells_works() {
        let cells = vec![vec![1, 2, 3], vec![4, 5, 6]];
        let grid = VisGrid::from_cells(&cells);
        let output = grid.to_vis_string("test");
        assert!(output.is_empty());
    }

    #[test]
    fn test_vis2dplane_operations_compile() {
        let mut plane = Vis2DPlane::new(100.0, 100.0);
        plane.add_circle(RED, BLUE, 50.0, 50.0, 10.0);
        plane.add_line(GREEN, 0.0, 0.0, 100.0, 100.0);
        plane.add_polygon(
            RED,
            YELLOW,
            vec![(10.0, 10.0), (90.0, 10.0), (90.0, 90.0), (10.0, 90.0)],
        );

        let output = plane.to_vis_string("test");
        assert!(output.is_empty());
    }

    #[test]
    fn test_visframe_operations_compile() {
        let grid = VisGrid::new(3, 3);
        let mut frame = VisFrame::new_grid(grid, "12345");
        frame.add_textarea("Debug info".to_string());
        frame.enable_debug();
        frame.disable_debug();
        frame.set_score("999".to_string());

        let output = frame.to_vis_string("test");
        assert!(output.is_empty());
    }

    #[test]
    fn test_visframe_with_2dplane_compiles() {
        let plane = Vis2DPlane::new(100.0, 100.0);
        let mut frame = VisFrame::new_2d_plane(plane, "score");
        frame.enable_debug();

        let output = frame.to_vis_string("test");
        assert!(output.is_empty());
    }

    #[test]
    fn test_visroot_operations_compile() {
        let mut root = VisRoot::new();

        let grid = VisGrid::new(2, 2);
        let frame = VisFrame::new_grid(grid, "100");
        root.add_frame("main", frame);

        let frame2 = VisFrame::new_grid(VisGrid::new(1, 1), "200");
        let frame3 = VisFrame::new_grid(VisGrid::new(1, 1), "300");
        root.add_frames("main", vec![frame2, frame3]);

        // get_frames returns None when vis is disabled
        assert!(root.get_frames("main").is_none());

        // output_all should do nothing
        root.output_all();
    }

    #[test]
    fn test_color_constants_exist() {
        // Verify that color constants are accessible
        let _ = WHITE;
        let _ = BLACK;
        let _ = GRAY;
        let _ = RED;
        let _ = BLUE;
        let _ = GREEN;
        let _ = YELLOW;
        let _ = CYAN;
        let _ = MAGENTA;
    }

    #[test]
    fn test_color_display_is_empty() {
        assert_eq!(RED.to_string(), "");
        assert_eq!(Color::new(128, 128, 128).to_string(), "");
    }
}
