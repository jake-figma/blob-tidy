const GAP = 50;

class Packer {
  fit(blocks) {
    const sortedByArea = blocks.sort((a, b) => b.area - a.area);
    this.blocks = {};
    this.idsLandscape = [];
    this.idsPortrait = [];
    let totalArea = 0;
    sortedByArea.forEach((block) => {
      if (block.portrait) {
        this.idsPortrait.push(block.id);
      }
      if (block.landscape) {
        this.idsLandscape.push(block.id);
      }
      this.blocks[block.id] = block;
      totalArea += block.area;
    });
    this.idsPortrait.sort(
      (a, b) =>
        this.blocks[b].height - this.blocks[a].height ||
        this.blocks[b].area - this.blocks[a].area
    );
    this.idsLandscape.sort(
      (a, b) =>
        this.blocks[b].width - this.blocks[a].width ||
        this.blocks[b].area - this.blocks[a].area
    );

    const diameter = Math.sqrt(totalArea * 1.1);
    this.performCorner(0, 0, diameter);
  }

  performCorner(
    startX,
    startY,
    diameter,
    i = 0,
    j = 0,
    used = {},
    loopIndex = 0
  ) {
    let x = startX;
    let y = startY;
    let newX = null;
    let newY = null;
    let firstX = false;
    while (x < diameter && i < this.idsPortrait.length) {
      const block = this.blocks[this.idsPortrait[i]];
      if (!used[block.id]) {
        if (newX === null && !firstX) {
          y += block.height;
        }
        if (newX === null && firstX) {
          newX = x;
        }
        firstX = true;
        used[block.id] = 1;
        block.fit = { x, y: startY };
        x += block.width;
      }
      i++;
    }
    while (y < diameter && j < this.idsLandscape.length) {
      const block = this.blocks[this.idsLandscape[j]];
      if (!used[block.id]) {
        used[block.id] = 1;
        block.fit = { x: startX, y };
        if (newY === null) {
          newY = y;
          if (startX + block.width > newX) {
            newX = startX + block.width;
          }
        }
        y += block.height;
      }
      j++;
    }
    if (loopIndex === 0) {
      this.root = { width: x, height: y };
    }
    if (newY !== null || newX !== null) {
      this.performCorner(newX, newY, diameter, i, j, used, loopIndex + 1);
    }
  }
}

const items = figma.currentPage.selection
  .filter((a) => Boolean(a.parent && a.parent.type === "PAGE" && !a.stuckTo))
  .map((a) => {
    const { x, y, width, height } = a.absoluteRenderBounds || a;
    return {
      id: a.id,
      x,
      y,
      height: height + GAP,
      width: width + GAP,
      area: (width + GAP) * (height + GAP),
      portrait: height >= width,
      landscape: height <= width,
    };
  });

const groups = [[], [], [], []];
items.forEach((item, i) => groups[i % 4].push(item));
groups.forEach((items, i) => {
  const packer = new Packer();
  packer.fit(items);
  if (packer.root) {
    const rootW = packer.root.width;
    const rootH = packer.root.height;
    const offsetX = i === 1 || i === 0 ? rootW * -1 : 0;
    const offsetY = i === 1 || i === 2 ? rootH * -1 : 0;
    items.forEach((item) => {
      const node = figma.getNodeById(item.id);
      if (item.fit) {
        const itemX =
          i === 1 || i === 0 ? rootW - item.fit.x - item.width : item.fit.x;
        const itemY =
          i === 1 || i === 2 ? rootH - item.fit.y - item.height : item.fit.y;
        const group = figma.group([node], node.parent);
        group.x = itemX + offsetX + figma.viewport.center.x;
        group.y = itemY + offsetY + figma.viewport.center.y;
        figma.ungroup(group);
      }
    });
  }
});

figma.closePlugin();
