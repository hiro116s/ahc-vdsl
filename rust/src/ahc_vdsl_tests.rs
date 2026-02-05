// Tests for vis feature enabled
#[cfg(feature = "vis")]
use super::ahc_vdsl::ahc_vdsl::*;

#[cfg(feature = "vis")]
#[test]
fn test_visgrid_new() {
    let grid = VisGrid::new(3, 4, None);
    let output = grid.to_vis_string("test");

    assert!(output.contains("$v(test) GRID 3 4"));
    assert!(output.contains("CELL_COLORS_POS"));
    assert!(!output.contains("CELL_TEXT")); // すべてのセルが空なので省略される
    assert!(output.contains("LINES"));
}

#[cfg(feature = "vis")]
#[test]
fn test_visgrid_with_bounds() {
    let bounds = ItemBounds::new(0.0, 0.0, 400.0, 400.0);
    let grid = VisGrid::new(3, 4, Some(bounds));
    let output = grid.to_vis_string("test");

    assert!(output.contains("$v(test) GRID(0, 0, 400, 400) 3 4"));
}

#[cfg(feature = "vis")]
#[test]
fn test_visgrid_update_cell_color() {
    let output = VisGrid::new(3, 3, None)
        .update_cell_color((1, 1), RED)
        .to_vis_string("test");
    assert!(output.contains("#FF0000"));
}

#[cfg(feature = "vis")]
#[test]
fn test_visgrid_update_text() {
    let output = VisGrid::new(3, 3, None)
        .update_text((1, 1), "hello".to_string())
        .to_vis_string("test");
    assert!(output.contains("hello"));
}

#[cfg(feature = "vis")]
#[test]
fn test_visgrid_cell_text_mid_empty() {
    // 途中の空セルは "" で出力される
    let output = VisGrid::new(2, 3, None)
        .update_text((0, 0), "a".to_string())
        .update_text((2, 0), "c".to_string())
        .to_vis_string("test");
    assert!(output.contains("CELL_TEXT"));
    // Row 0: a "" c（中間の空セルが ""）
    assert!(output.contains("a \"\" c"));
}

#[cfg(feature = "vis")]
#[test]
fn test_visgrid_cell_text_trailing_empty() {
    // 末尾の空セルは省略される
    let output = VisGrid::new(1, 3, None)
        .update_text((0, 0), "hello".to_string())
        .to_vis_string("test");
    assert!(output.contains("CELL_TEXT"));
    // "hello" の後ろの空セルが省略されるため、行は "hello\n"
    assert!(output.contains("hello\n"));
    assert!(!output.contains("hello "));
}

#[cfg(feature = "vis")]
#[test]
fn test_visgrid_add_line() {
    let output = VisGrid::new(5, 5, None)
        .add_line(vec![(0, 0), (1, 1), (2, 2)], BLUE)
        .to_vis_string("test");
    assert!(output.contains("LINES"));
    assert!(output.contains("1")); // 1 line
    assert!(output.contains("#0000FF")); // BLUE color
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
fn test_color_from_string() {
    let color = Color::from(&"#FF8800".to_string());
    assert_eq!(color.to_string(), "#FF8800");

    let color2 = Color::from(&"00FF00".to_string());
    assert_eq!(color2.to_string(), "#00FF00");
}

#[cfg(feature = "vis")]
#[test]
fn test_visgrid_multiple_operations() {
    let output = VisGrid::new(4, 4, None)
        // Update multiple cell colors
        .update_cell_color((0, 0), RED)
        .update_cell_color((3, 3), BLUE)
        .update_cell_color((1, 1), GREEN)
        // Add multiple lines
        .add_line(vec![(0, 0), (1, 0), (2, 0)], YELLOW)
        .add_line(vec![(0, 3), (1, 3), (2, 3), (3, 3)], CYAN)
        .to_vis_string("multi");

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
    let output = VisGrid::new(2, 2, None)
        .remove_wall_vertical((1, 0))
        .remove_wall_horizontal((0, 1))
        .to_vis_string("walls");
    assert!(output.contains("WALL_VERTICAL"));
    assert!(output.contains("WALL_HORIZONTAL"));
}

#[cfg(feature = "vis")]
#[test]
fn test_vis2dplane_new() {
    let plane = Vis2DPlane::new(100.0, 100.0, None);
    let output = plane.to_vis_string("test");
    assert!(output.contains("$v(test) 2D_PLANE 100 100"));
}

#[cfg(feature = "vis")]
#[test]
fn test_vis2dplane_with_bounds() {
    let bounds = ItemBounds::new(0.0, 0.0, 400.0, 400.0);
    let plane = Vis2DPlane::new(100.0, 100.0, Some(bounds));
    let output = plane.to_vis_string("test");
    assert!(output.contains("$v(test) 2D_PLANE(0, 0, 400, 400) 100 100"));
}

#[cfg(feature = "vis")]
#[test]
fn test_vis2dplane_add_circle() {
    let output = Vis2DPlane::new(100.0, 100.0, None)
        .add_circle(RED, BLUE, 50.0, 50.0, 10.0)
        .to_vis_string("test");
    assert!(output.contains("CIRCLES"));
    assert!(output.contains("#FF0000")); // RED stroke
    assert!(output.contains("#0000FF")); // BLUE fill
    assert!(output.contains("50 50 10"));
}

#[cfg(feature = "vis")]
#[test]
fn test_vis2dplane_add_line() {
    let output = Vis2DPlane::new(100.0, 100.0, None)
        .add_line(GREEN, 2.0, 0.0, 0.0, 100.0, 100.0)
        .to_vis_string("test");
    assert!(output.contains("LINES"));
    assert!(output.contains("#00FF00")); // GREEN
    assert!(output.contains("2 1 0 0 100 100"));
}

#[cfg(feature = "vis")]
#[test]
fn test_vis2dplane_add_polygon() {
    let output = Vis2DPlane::new(100.0, 100.0, None)
        .add_polygon(
            RED,
            YELLOW,
            vec![(10.0, 10.0), (90.0, 10.0), (90.0, 90.0), (10.0, 90.0)],
        )
        .to_vis_string("test");
    assert!(output.contains("POLYGONS"));
    assert!(output.contains("#FF0000")); // RED stroke
    assert!(output.contains("#FFFF00")); // YELLOW fill
    assert!(output.contains("4")); // 4 vertices
}

#[cfg(feature = "vis")]
#[test]
fn test_vis2dplane_add_text() {
    let output = Vis2DPlane::new(100.0, 100.0, None)
        .add_text(BLACK, 12.0, 50.0, 50.0, "Hello".to_string())
        .to_vis_string("test");
    assert!(output.contains("TEXT"));
    assert!(output.contains("#000000")); // BLACK color
    assert!(output.contains("12")); // font size
    assert!(output.contains("50 50 Hello"));
}

#[cfg(feature = "vis")]
#[test]
fn test_vis2dplane_add_text_with_space() {
    let output = Vis2DPlane::new(100.0, 100.0, None)
        .add_text(RED, 16.0, 25.0, 75.0, "Hello World".to_string())
        .to_vis_string("test");
    assert!(output.contains("TEXT"));
    assert!(output.contains("\"Hello World\"")); // quoted text with space
}

#[cfg(feature = "vis")]
#[test]
fn test_vis2dplane_text_grouping() {
    // 同じ色とフォントサイズのテキストは1つのグループにまとめられることを確認
    let output = Vis2DPlane::new(100.0, 100.0, None)
        .add_text(RED, 12.0, 10.0, 10.0, "A".to_string())
        .add_text(RED, 12.0, 20.0, 20.0, "B".to_string())
        .add_text(BLUE, 12.0, 30.0, 30.0, "C".to_string())
        .to_vis_string("test");
    assert!(output.contains("TEXT\n2\n")); // 2 groups (RED and BLUE)
}

#[cfg(feature = "vis")]
#[test]
fn test_vis2dplane_circle_grouping() {
    // 同じ色の円を複数追加すると、1つのグループにまとめられることを確認
    let output = Vis2DPlane::new(100.0, 100.0, None)
        .add_circle(RED, BLUE, 10.0, 10.0, 5.0)
        .add_circle(RED, BLUE, 20.0, 20.0, 5.0)
        .add_circle(RED, BLUE, 30.0, 30.0, 5.0)
        .add_circle(GREEN, YELLOW, 40.0, 40.0, 8.0) // 異なる色
        .to_vis_string("test");

    assert!(output.contains("CIRCLES"));
    // グループ数は2つ（RED-BLUEとGREEN-YELLOW）
    let circles_section = output.split("CIRCLES").nth(1).unwrap();
    let first_line = circles_section.lines().nth(1).unwrap().trim();
    assert_eq!(first_line, "2"); // 2グループ

    // RED-BLUEグループに3つの円が含まれることを確認
    assert!(output.contains("#FF0000 #0000FF 3")); // stroke=RED, fill=BLUE, count=3
    assert!(output.contains("10 10 5"));
    assert!(output.contains("20 20 5"));
    assert!(output.contains("30 30 5"));

    // GREEN-YELLOWグループに1つの円が含まれることを確認
    assert!(output.contains("#00FF00 #FFFF00 1")); // stroke=GREEN, fill=YELLOW, count=1
    assert!(output.contains("40 40 8"));
}

#[cfg(feature = "vis")]
#[test]
fn test_vis2dplane_line_grouping() {
    // 同じ色・widthのラインを複数追加すると、1つのグループにまとめられることを確認
    let output = Vis2DPlane::new(100.0, 100.0, None)
        .add_line(RED, 2.0, 0.0, 0.0, 10.0, 10.0)
        .add_line(RED, 2.0, 10.0, 10.0, 20.0, 20.0)
        .add_line(RED, 2.0, 20.0, 20.0, 30.0, 30.0)
        .add_line(BLUE, 3.0, 40.0, 40.0, 50.0, 50.0) // 異なる色
        .to_vis_string("test");

    assert!(output.contains("LINES"));
    // グループ数は2つ（RED-2.0とBLUE-3.0）
    let lines_section = output.split("LINES").nth(1).unwrap();
    let first_line = lines_section.lines().nth(1).unwrap().trim();
    assert_eq!(first_line, "2"); // 2グループ

    // RED-2.0グループに3本の線が含まれることを確認
    assert!(output.contains("#FF0000 2 3")); // color=RED, width=2.0, count=3
    assert!(output.contains("0 0"));
    assert!(output.contains("10 10"));
    assert!(output.contains("20 20"));
    assert!(output.contains("30 30"));

    // BLUE-3.0グループに1本の線が含まれることを確認
    assert!(output.contains("#0000FF 3 1")); // color=BLUE, width=3.0, count=1
    assert!(output.contains("40 40"));
    assert!(output.contains("50 50"));
}

#[cfg(feature = "vis")]
#[test]
fn test_visframe_new() {
    let output = VisFrame::new()
        .set_score("12345".to_string())
        .add_textarea(VisTextArea::new("Info".to_string(), "Debug info".to_string()))
        .to_vis_string("test");
    assert!(output.contains("$v(test) SCORE 12345"));
    assert!(output.contains("$v(test) TEXTAREA Info 200 #000000 #ffffff Debug info"));
    assert!(output.contains("$v(test) COMMIT"));
}

#[cfg(feature = "vis")]
#[test]
fn test_visframe_with_grid() {
    let grid = VisGrid::new(3, 3, None);
    let output = VisFrame::new()
        .add_grid(grid)
        .set_score("12345".to_string())
        .add_textarea(VisTextArea::new("Title".to_string(), "Debug info".to_string()))
        .to_vis_string("test");
    assert!(output.contains("$v(test) GRID 3 3"));
    assert!(output.contains("$v(test) SCORE 12345"));
    assert!(output.contains("$v(test) TEXTAREA Title 200 #000000 #ffffff Debug info"));
    assert!(output.contains("$v(test) COMMIT"));
}

#[cfg(feature = "vis")]
#[test]
fn test_textarea_basic() {
    let textarea = VisTextArea::new("Info".to_string(), "Some debug information".to_string());
    let output = VisFrame::new()
        .add_textarea(textarea)
        .to_vis_string("test");
    assert!(output.contains("$v(test) TEXTAREA Info 200 #000000 #ffffff Some debug information"));
}

#[cfg(feature = "vis")]
#[test]
fn test_textarea_custom() {
    let textarea = VisTextArea::new("CustomInfo".to_string(), "Custom message".to_string())
        .height(300)
        .text_color("#ff0000".to_string())
        .fill_color("#ffff00".to_string());
    let output = VisFrame::new()
        .add_textarea(textarea)
        .to_vis_string("test");
    assert!(output.contains("$v(test) TEXTAREA CustomInfo 300 #ff0000 #ffff00 Custom message"));
}

#[cfg(feature = "vis")]
#[test]
fn test_textarea_empty_text() {
    let textarea = VisTextArea::new("EmptyInfo".to_string(), "".to_string());
    let output = VisFrame::new()
        .add_textarea(textarea)
        .to_vis_string("test");
    assert!(output.contains("$v(test) TEXTAREA EmptyInfo 200 #000000 #ffffff \"\""));
}

#[cfg(feature = "vis")]
#[test]
fn test_visframe_with_2dplane() {
    let output = VisFrame::new()
        .add_2d_plane(Vis2DPlane::new(100.0, 100.0, None).add_circle(RED, BLUE, 50.0, 50.0, 10.0))
        .enable_debug()
        .to_vis_string("test");
    assert!(output.contains("$v(test) 2D_PLANE 100 100"));
    assert!(output.contains("$v(test) DEBUG"));
    assert!(output.contains("$v(test) COMMIT"));
}

#[cfg(feature = "vis")]
#[test]
fn test_visframe_with_canvas() {
    let grid1 = VisGrid::new(10, 10, Some(ItemBounds::new(0.0, 0.0, 400.0, 400.0)));
    let grid2 = VisGrid::new(5, 5, Some(ItemBounds::new(500.0, 0.0, 900.0, 400.0)));

    let output = VisFrame::new()
        .set_canvas(VisCanvas::new(800.0, 1000.0))
        .add_grid(grid1)
        .add_grid(grid2)
        .set_score("999".to_string())
        .to_vis_string("test");
    assert!(output.contains("$v(test) CANVAS 800 1000"));
    assert!(output.contains("$v(test) GRID(0, 0, 400, 400) 10 10"));
    assert!(output.contains("$v(test) GRID(500, 0, 900, 400) 5 5"));
    assert!(output.contains("$v(test) SCORE 999"));
    assert!(output.contains("$v(test) COMMIT"));
}

#[cfg(feature = "vis")]
#[test]
fn test_visroot_add_frame() {
    let mut root = VisRoot::new();

    // Create first frame
    root.add_frame(
        "main",
        VisFrame::new()
            .add_grid(VisGrid::new(2, 2, None))
            .set_score("100".to_string()),
    );

    // Create second frame
    root.add_frame(
        "main",
        VisFrame::new()
            .add_grid(VisGrid::new(2, 2, None).update_cell_color((0, 0), RED))
            .set_score("200".to_string()),
    );

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
    root.add_frame(
        "main",
        VisFrame::new()
            .add_grid(VisGrid::new(1, 1, None))
            .set_score("100".to_string()),
    );

    // Debug mode
    root.add_frame(
        "debug",
        VisFrame::new()
            .add_grid(VisGrid::new(1, 1, None))
            .add_textarea(VisTextArea::new("Debug".to_string(), "Debug message".to_string())),
    );

    assert_eq!(root.get_frames("main").unwrap().len(), 1);
    assert_eq!(root.get_frames("debug").unwrap().len(), 1);
}

#[cfg(feature = "vis")]
#[test]
fn test_visroot_add_frames() {
    let mut root = VisRoot::new();

    let frames_to_add: Vec<_> = [100, 200, 300]
        .iter()
        .map(|&score| {
            VisFrame::new()
                .add_grid(VisGrid::new(1, 1, None))
                .set_score(score.to_string())
        })
        .collect();

    root.add_frames("main", frames_to_add);

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
    root.add_frame(
        "test",
        VisFrame::new()
            .add_grid(VisGrid::new(2, 2, None).update_cell_color((0, 0), RED))
            .set_score("12345".to_string()),
    );

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
    root.add_frame(
        "main",
        VisFrame::new()
            .add_grid(VisGrid::new(1, 1, None))
            .set_score("100".to_string()),
    );

    root.add_frame(
        "debug",
        VisFrame::new()
            .add_2d_plane(Vis2DPlane::new(50.0, 50.0, None).add_circle(RED, BLUE, 25.0, 25.0, 5.0))
            .set_score("200".to_string()),
    );

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
        let output = VisGrid::new(10, 10, None)
            .update_cell_color((5, 5), RED)
            .update_text((5, 5), "test".to_string())
            .add_line(vec![(0, 0), (1, 1), (2, 2)], BLUE)
            .remove_wall_vertical((1, 0))
            .remove_wall_horizontal((0, 1))
            .add_wall_vertical((2, 0))
            .add_wall_horizontal((0, 2))
            .to_vis_string("test");
        assert!(output.is_empty()); // Output should be empty when vis is disabled
    }

    #[test]
    fn test_visgrid_with_bounds_compiles() {
        let bounds = ItemBounds::new(0.0, 0.0, 400.0, 400.0);
        let grid = VisGrid::new(10, 10, Some(bounds));
        let output = grid.to_vis_string("test");
        assert!(output.is_empty());
    }

    #[test]
    fn test_vis2dplane_operations_compile() {
        let output = Vis2DPlane::new(100.0, 100.0, None)
            .add_circle(RED, BLUE, 50.0, 50.0, 10.0)
            .add_line(GREEN, 2.0, 0.0, 0.0, 100.0, 100.0)
            .add_polygon(
                RED,
                YELLOW,
                vec![(10.0, 10.0), (90.0, 10.0), (90.0, 90.0), (10.0, 90.0)],
            )
            .to_vis_string("test");
        assert!(output.is_empty());
    }

    #[test]
    fn test_vis2dplane_with_bounds_compiles() {
        let bounds = ItemBounds::new(0.0, 0.0, 400.0, 400.0);
        let plane = Vis2DPlane::new(100.0, 100.0, Some(bounds));
        let output = plane.to_vis_string("test");
        assert!(output.is_empty());
    }

    #[test]
    fn test_visframe_operations_compile() {
        let grid = VisGrid::new(3, 3, None);
        let output = VisFrame::new()
            .add_grid(grid)
            .add_textarea(VisTextArea::new("Info".to_string(), "Debug info".to_string()))
            .enable_debug()
            .disable_debug()
            .set_score("999".to_string())
            .to_vis_string("test");
        assert!(output.is_empty());
    }

    #[test]
    fn test_visframe_with_2dplane_compiles() {
        let plane = Vis2DPlane::new(100.0, 100.0, None);
        let output = VisFrame::new()
            .add_2d_plane(plane)
            .enable_debug()
            .to_vis_string("test");
        assert!(output.is_empty());
    }

    #[test]
    fn test_visframe_with_canvas_compiles() {
        let grid = VisGrid::new(10, 10, Some(ItemBounds::new(0.0, 0.0, 400.0, 400.0)));
        let output = VisFrame::new()
            .set_canvas(VisCanvas::new(800.0, 1000.0))
            .add_grid(grid)
            .to_vis_string("test");
        assert!(output.is_empty());
    }

    #[test]
    fn test_visroot_operations_compile() {
        let mut root = VisRoot::new();

        let grid = VisGrid::new(2, 2, None);
        let frame = VisFrame::new().add_grid(grid).set_score("100".to_string());
        root.add_frame("main", frame);

        let frame2 = VisFrame::new()
            .add_grid(VisGrid::new(1, 1, None))
            .set_score("200".to_string());

        let frame3 = VisFrame::new()
            .add_grid(VisGrid::new(1, 1, None))
            .set_score("300".to_string());

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

#[cfg(feature = "vis")]
#[test]
fn test_bar_graph_basic() {
    let output = VisBarGraph::new("Stats".to_string(), BLUE, 0.0, 100.0)
        .add_item("A".to_string(), 50.0)
        .add_item("B".to_string(), 75.0)
        .to_vis_string("test");
    assert!(output.contains("$v(test) BAR_GRAPH Stats #0000FF 0 100"));
    assert!(output.contains("2 A 50 B 75"));
}

#[cfg(feature = "vis")]
#[test]
fn test_bar_graph_title_with_space() {
    let output = VisBarGraph::new("My Stats".to_string(), BLUE, 0.0, 100.0)
        .add_item("A".to_string(), 50.0)
        .to_vis_string("test");
    assert!(output.contains("$v(test) BAR_GRAPH \"My Stats\" #0000FF 0 100"));
}

#[cfg(feature = "vis")]
#[test]
fn test_bar_graph_empty_title() {
    let output = VisBarGraph::new("".to_string(), RED, 0.0, 50.0)
        .add_item("X".to_string(), 25.0)
        .to_vis_string("test");
    assert!(output.contains("$v(test) BAR_GRAPH \"\" #FF0000 0 50"));
}

#[cfg(feature = "vis")]
#[test]
fn test_bar_graph_add_items() {
    let items = vec![
        BarGraphItem::new("X".to_string(), -5.0),
        BarGraphItem::new("Y".to_string(), 0.0),
        BarGraphItem::new("Z".to_string(), 7.5),
    ];
    let output = VisBarGraph::new("Values".to_string(), RED, -10.0, 10.0)
        .add_items(items)
        .to_vis_string("test");
    assert!(output.contains("$v(test) BAR_GRAPH Values #FF0000 -10 10"));
    assert!(output.contains("3 X -5 Y 0 Z 7.5"));
}

#[cfg(feature = "vis")]
#[test]
fn test_frame_add_bar_graph() {
    let output = VisFrame::new()
        .add_bar_graph(
            VisBarGraph::new("Performance".to_string(), GREEN, 0.0, 200.0)
                .add_item("Item1".to_string(), 100.0)
                .add_item("Item2".to_string(), 150.0),
        )
        .set_score("12345".to_string())
        .to_vis_string("main");
    assert!(output.contains("$v(main) BAR_GRAPH Performance #00FF00 0 200"));
    assert!(output.contains("2 Item1 100 Item2 150"));
    assert!(output.contains("$v(main) SCORE 12345"));
    assert!(output.contains("$v(main) COMMIT"));
}

#[cfg(feature = "vis")]
#[test]
fn test_bar_graph_item_new() {
    let item = BarGraphItem::new("TestLabel".to_string(), 42.5);
    assert_eq!(item.label, "TestLabel");
    assert_eq!(item.value, 42.5);
}

#[cfg(not(feature = "vis"))]
mod bar_graph_disabled_tests {
    use super::super::ahc_vdsl::ahc_vdsl::*;

    #[test]
    fn test_bar_graph_operations_compile() {
        let output = VisBarGraph::new("Test".to_string(), RED, 0.0, 100.0)
            .add_item("A".to_string(), 50.0)
            .add_items(vec![BarGraphItem::new("B".to_string(), 75.0)])
            .to_vis_string("test");
        assert!(output.is_empty());
    }

    #[test]
    fn test_frame_add_bar_graph_compiles() {
        let bar_graph = VisBarGraph::new("Test".to_string(), GREEN, 0.0, 100.0);
        let output = VisFrame::new()
            .add_bar_graph(bar_graph)
            .to_vis_string("test");
        assert!(output.is_empty());
    }
}
