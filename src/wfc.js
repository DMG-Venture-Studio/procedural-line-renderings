/* Wave Function Collapse on a grid of socketed tiles. */

/** Collapse a cols x rows grid. tiles: [{sockets: {T, R, B, L}, weight}]. Two tiles may touch
    when the facing sockets match. bounds: socket values required at the grid edges, or null.
    Returns an array of tile indices (row-major), or null after maxTries contradictions. */
export function wfc(r, tiles, cols, rows, bounds, maxTries) {
  var opp = { T: 'B', R: 'L', B: 'T', L: 'R' };
  var dirs = { T: [0, -1], R: [1, 0], B: [0, 1], L: [-1, 0] };
  function attempt() {
    var cells = [];
    for (var i = 0; i < cols * rows; i++) cells.push(tiles.map(function (_, k) { return k; }));
    function at(x, y) { return cells[y * cols + x]; }
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      cells[y * cols + x] = at(x, y).filter(function (k) {
        var s = tiles[k].sockets;
        return (y > 0 || !bounds.T || s.T === bounds.T) && (y < rows - 1 || !bounds.B || s.B === bounds.B)
            && (x > 0 || !bounds.L || s.L === bounds.L) && (x < cols - 1 || !bounds.R || s.R === bounds.R);
      });
    }
    function propagate(sx, sy) {
      var q = [[sx, sy]];
      while (q.length) {
        var c = q.pop(), x = c[0], y = c[1], here = at(x, y);
        for (var d in dirs) {
          var nx = x + dirs[d][0], ny = y + dirs[d][1];
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          var there = at(nx, ny), ok = {};
          here.forEach(function (k) { ok[tiles[k].sockets[d]] = true; });
          var kept = there.filter(function (k) { return ok[tiles[k].sockets[opp[d]]]; });
          if (kept.length === 0) return false;
          if (kept.length < there.length) { cells[ny * cols + nx] = kept; q.push([nx, ny]); }
        }
      }
      return true;
    }
    for (var y2 = 0; y2 < rows; y2++) for (var x2 = 0; x2 < cols; x2++) if (!propagate(x2, y2)) return null;
    for (;;) {
      var best = -1, bestN = Infinity;
      for (var i2 = 0; i2 < cells.length; i2++) {
        var n = cells[i2].length;
        if (n > 1 && (n < bestN || (n === bestN && r() < 0.5))) { best = i2; bestN = n; }
      }
      if (best < 0) return cells.map(function (c) { return c[0]; });
      var opts = cells[best], total = 0;
      opts.forEach(function (k) { total += tiles[k].weight || 1; });
      var pickAt = r() * total, chosen = opts[opts.length - 1];
      for (var j = 0; j < opts.length; j++) { pickAt -= tiles[opts[j]].weight || 1; if (pickAt <= 0) { chosen = opts[j]; break; } }
      cells[best] = [chosen];
      if (!propagate(best % cols, Math.floor(best / cols))) return null;
    }
  }
  for (var t = 0; t < (maxTries || 20); t++) { var g = attempt(); if (g) return g; }
  return null;
}
