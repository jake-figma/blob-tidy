const GAP = 50;
const PI = Math.PI;

class Packer {
  fit(blocks) {
    const sortedByArea = blocks.sort((a, b) => b.area - a.area);
    this.blocks = {};
    this.idsByWidth = [];
    this.idsByHeight = [];
    let totalArea = 0;
    sortedByArea.forEach((block) => {
      this.idsByHeight.push(block.id);
      this.idsByWidth.push(block.id);
      this.blocks[block.id] = block;
      totalArea += block.area;
    });
    this.idsByHeight.sort(
      (a, b) =>
        this.blocks[b].height - this.blocks[a].height ||
        this.blocks[b].area - this.blocks[a].area
    );
    this.idsByWidth.sort(
      (a, b) =>
        this.blocks[b].width - this.blocks[a].width ||
        this.blocks[b].area - this.blocks[a].area
    );

    return this.performLoop(totalArea, 1);
  }

  performLoop(totalArea, factor) {
    return new Promise((resolve) => {
      const fit = this.performCorner(0, 0, Math.sqrt(totalArea * factor));
      resolve(fit ? true : this.performLoop(totalArea, factor + 0.04));
    });
  }

  adjustedDiameterFromDiameterAndPosition(position, diameter) {
    const degrees = (position / diameter) * 45;
    const angle = degrees * (PI / 180);
    return Math.cos(angle) * diameter;
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
    let firstHeight = null;
    let firstWidth = null;
    const di = this.adjustedDiameterFromDiameterAndPosition(startX, diameter);
    while (x < di && i < this.idsByHeight.length) {
      const block = this.blocks[this.idsByHeight[i]];
      if (!used[block.id]) {
        if (newX === null && !firstX) {
          y += block.height;
        }
        if (firstHeight === null) {
          firstHeight = block.height;
        }
        if (newX === null && firstX) {
          newX = x;
        }
        firstX = true;
        used[block.id] = 1;
        const localY = startY + Math.floor((firstHeight - block.height) * 0.5);
        block.fit = { x, y: localY };
        x += block.width;
      }
      i++;
    }
    while (y < di && j < this.idsByWidth.length) {
      const block = this.blocks[this.idsByWidth[j]];
      if (!used[block.id]) {
        if (firstWidth === null) {
          firstWidth = block.width;
        }
        used[block.id] = 1;
        const localX = startX + Math.floor((firstWidth - block.width) * 0.5);
        block.fit = { x: localX, y };
        if (newY === null) {
          newY = y;
          newX = startX + block.width;
        }
        y += block.height;
      }
      j++;
    }
    if (loopIndex === 0) {
      this.root = { width: x, height: y };
    }
    if (newY !== null && newX !== null) {
      return this.performCorner(
        newX,
        newY,
        diameter,
        i,
        j,
        used,
        loopIndex + 1
      );
    }
    return Object.keys(used).length === Object.keys(this.blocks).length;
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
    };
  });

const groups = [[], [], [], []];
items.forEach((item, i) => groups[i % 4].push(item));

run();

async function run() {
  await Promise.all(groups.map(pack));
  figma.viewport.scrollAndZoomIntoView(figma.currentPage.selection);
  figma.closePlugin();
}

async function pack(items, i) {
  const packer = new Packer();
  await packer.fit(items);
  const rootW = packer.root.width;
  const rootH = packer.root.height;
  const flipX = i === 1 || i === 2;
  const flipY = i === 2 || i === 3;
  const offsetX = flipX ? rootW * -1 : 0;
  const offsetY = flipY ? rootH * -1 : 0;
  items.forEach((item) => {
    const node = figma.getNodeById(item.id);
    const itemX = flipX ? rootW - item.fit.x - item.width : item.fit.x;
    const itemY = flipY ? rootH - item.fit.y - item.height : item.fit.y;
    const group = figma.group([node], node.parent);
    group.x = itemX + offsetX + figma.viewport.center.x;
    group.y = itemY + offsetY + figma.viewport.center.y;
    figma.ungroup(group);
  });
  return true;
}
