fn main() {
    let mut x = 0;
    let mut y = 0;
    let mut lines = vec![];
    for i in 0..5 {
        for j in 0..5 {
            lines.push((x, y));
            println!("$v GRID 5 5 #333333 #000000 #FFFFFF");
            println!("CELL_COLORS_POS");
            println!("1");
            println!("#FF8888 1 {} {}", x, y);
            println!("LINES");
            println!("1");
            print!("#0000FF {} ", lines.len());
            for (x, y) in lines.iter() {
                print!("{} {} ", x, y);
            }
            println!();
            println!("$v DEBUG");
            println!("$v COMMIT");
            if j != 4 {
                x += if i % 2 == 0 { 1 } else { -1 };
            }
        }
        y += 1;
    }
}
