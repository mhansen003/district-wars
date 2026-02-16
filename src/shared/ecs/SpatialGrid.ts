// Spatial Hash Grid — Fast proximity queries for combat and targeting

export class SpatialGrid {
  private cellSize: number;
  private grid: Map<string, Set<number>> = new Map();

  constructor(cellSize: number = 64) {
    this.cellSize = cellSize;
  }

  clear(): void {
    this.grid.clear();
  }

  private key(x: number, y: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }

  insert(entityId: number, x: number, y: number): void {
    const k = this.key(x, y);
    let cell = this.grid.get(k);
    if (!cell) {
      cell = new Set();
      this.grid.set(k, cell);
    }
    cell.add(entityId);
  }

  queryRadius(x: number, y: number, range: number): number[] {
    const results: number[] = [];
    const minCX = Math.floor((x - range) / this.cellSize);
    const maxCX = Math.floor((x + range) / this.cellSize);
    const minCY = Math.floor((y - range) / this.cellSize);
    const maxCY = Math.floor((y + range) / this.cellSize);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const cell = this.grid.get(`${cx},${cy}`);
        if (cell) {
          for (const id of cell) results.push(id);
        }
      }
    }
    return results;
  }
}
