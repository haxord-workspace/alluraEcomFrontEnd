/**
 * Geometric helper to calculate exact SVG paths for the realistic vintage coupon ticket:
 * - Scalloped outer left & right edges with whole number of semicircle bites
 * - Inverted / concave quarter-circle corners
 * - Semicircular tear-line perforation notches
 * - Inner stitched border path with matching insets
 * - Edge thickness & rim highlight paths
 */

export interface TicketPathOptions {
  isFeatured?: boolean;
  isMobile?: boolean;
  isWide?: boolean;
  isCompact?: boolean;
  notchX?: number;
  notchY?: number;
}

export interface TicketData {
  outer: string;
  inner: string;
  leftEdge: string;
  rightEdge: string;
}

export function generateTicketData(
  w: number,
  h: number,
  options: TicketPathOptions = {}
): TicketData {
  const isWide = options.isWide ?? (options.isFeatured && !options.isMobile);
  const isCompact = options.isCompact ?? options.isMobile ?? false;

  // Ensure valid dimensions
  const width = Math.max(100, w || (isWide ? 1000 : 360));
  const height = Math.max(100, h || (isWide ? 260 : 520));

  const notchX = options.notchX ?? (isWide ? width - Math.min(360, Math.max(280, width * 0.36)) : width * 0.62);
  const notchY = options.notchY ?? height * 0.5;

  const baseCornerR = isCompact ? 10 : 14;
  const baseScallopR = isCompact ? 5 : 6;
  const scallopPitch = isCompact ? 14 : 16;
  const baseNotchR = isCompact ? 9 : 12;

  // Clear distance from corner cutouts (at least 18px)
  const cornerClearance = 18;
  const topSafe = baseCornerR + cornerClearance;
  const bottomSafe = height - baseCornerR - cornerClearance;

  const hasTopBottomNotch = isWide;
  const hasLeftRightNotch = !hasTopBottomNotch;

  // Calculate whole scallop vertical centers
  const rightScallops: number[] = [];

  if (hasLeftRightNotch) {
    // Gap around the middle notch (at least one bite radius clearance on each side)
    const notchClearance = baseNotchR + baseScallopR + (isCompact ? 4 : 6);
    
    // Top segment above notch
    const topSegmentBottom = Math.min(notchY - notchClearance, bottomSafe);
    const topSpan = topSegmentBottom - topSafe;
    if (topSpan >= scallopPitch) {
      const count = Math.floor(topSpan / scallopPitch);
      const step = topSpan / count;
      for (let i = 0; i < count; i++) {
        rightScallops.push(topSafe + step * (i + 0.5));
      }
    }

    // Bottom segment below notch
    const bottomSegmentTop = Math.max(notchY + notchClearance, topSafe);
    const bottomSpan = bottomSafe - bottomSegmentTop;
    if (bottomSpan >= scallopPitch) {
      const count = Math.floor(bottomSpan / scallopPitch);
      const step = bottomSpan / count;
      for (let i = 0; i < count; i++) {
        rightScallops.push(bottomSegmentTop + step * (i + 0.5));
      }
    }
  } else {
    // Continuous scallops from topSafe to bottomSafe
    const span = bottomSafe - topSafe;
    if (span >= scallopPitch) {
      const count = Math.floor(span / scallopPitch);
      const step = span / count;
      for (let i = 0; i < count; i++) {
        rightScallops.push(topSafe + step * (i + 0.5));
      }
    }
  }

  // Left scallops mirror right scallops (read bottom to top when tracing clockwise)
  const leftScallops = [...rightScallops].reverse();

  // Helper to construct path with arbitrary inset
  function makePath(inset: number): string {
    const cornerR = Math.max(2, baseCornerR - inset);
    const scallopR = Math.max(2, baseScallopR - inset * 0.5);
    const notchR = Math.max(3, baseNotchR - inset);

    const x0 = inset;
    const y0 = inset;
    const x1 = width - inset;
    const y1 = height - inset;

    let d = `M ${x0 + cornerR} ${y0} `;

    // Top edge
    if (hasTopBottomNotch) {
      d += `L ${notchX - notchR} ${y0} `;
      d += `A ${notchR} ${notchR} 0 0 0 ${notchX + notchR} ${y0} `;
    }
    d += `L ${x1 - cornerR} ${y0} `;

    // Top-Right corner (concave quarter-circle)
    d += `A ${cornerR} ${cornerR} 0 0 0 ${x1} ${y0 + cornerR} `;

    // Right edge
    if (hasLeftRightNotch) {
      let notchDrawn = false;
      for (const sy of rightScallops) {
        if (!notchDrawn && sy > notchY) {
          d += `L ${x1} ${notchY - notchR} `;
          d += `A ${notchR} ${notchR} 0 0 0 ${x1} ${notchY + notchR} `;
          notchDrawn = true;
        }
        d += `L ${x1} ${sy - scallopR} `;
        d += `A ${scallopR} ${scallopR} 0 0 0 ${x1} ${sy + scallopR} `;
      }
      if (!notchDrawn) {
        d += `L ${x1} ${notchY - notchR} `;
        d += `A ${notchR} ${notchR} 0 0 0 ${x1} ${notchY + notchR} `;
      }
    } else {
      for (const sy of rightScallops) {
        d += `L ${x1} ${sy - scallopR} `;
        d += `A ${scallopR} ${scallopR} 0 0 0 ${x1} ${sy + scallopR} `;
      }
    }
    d += `L ${x1} ${y1 - cornerR} `;

    // Bottom-Right corner (concave quarter-circle)
    d += `A ${cornerR} ${cornerR} 0 0 0 ${x1 - cornerR} ${y1} `;

    // Bottom edge
    if (hasTopBottomNotch) {
      d += `L ${notchX + notchR} ${y1} `;
      d += `A ${notchR} ${notchR} 0 0 0 ${notchX - notchR} ${y1} `;
    }
    d += `L ${x0 + cornerR} ${y1} `;

    // Bottom-Left corner (concave quarter-circle)
    d += `A ${cornerR} ${cornerR} 0 0 0 ${x0} ${y1 - cornerR} `;

    // Left edge (tracing upwards)
    if (hasLeftRightNotch) {
      let notchDrawn = false;
      for (const sy of leftScallops) {
        if (!notchDrawn && sy < notchY) {
          d += `L ${x0} ${notchY + notchR} `;
          d += `A ${notchR} ${notchR} 0 0 0 ${x0} ${notchY - notchR} `;
          notchDrawn = true;
        }
        d += `L ${x0} ${sy + scallopR} `;
        d += `A ${scallopR} ${scallopR} 0 0 0 ${x0} ${sy - scallopR} `;
      }
      if (!notchDrawn) {
        d += `L ${x0} ${notchY + notchR} `;
        d += `A ${notchR} ${notchR} 0 0 0 ${x0} ${notchY - notchR} `;
      }
    } else {
      for (const sy of leftScallops) {
        d += `L ${x0} ${sy + scallopR} `;
        d += `A ${scallopR} ${scallopR} 0 0 0 ${x0} ${sy - scallopR} `;
      }
    }
    d += `L ${x0} ${y0 + cornerR} `;

    // Top-Left corner (concave quarter-circle)
    d += `A ${cornerR} ${cornerR} 0 0 0 ${x0 + cornerR} ${y0} `;
    d += 'Z';
    return d;
  }

  // Generate left & right edge paths for paper thickness and rim highlight
  function makeEdgePath(side: 'left' | 'right'): string {
    const isLeft = side === 'left';
    const x = isLeft ? 0 : width;
    const scallops = isLeft ? [...leftScallops].reverse() : rightScallops;
    const scallopR = baseScallopR;

    if (scallops.length === 0) return '';

    let d = `M ${x} ${topSafe - 8} `;
    for (const sy of scallops) {
      d += `L ${x} ${sy - scallopR} `;
      d += `A ${scallopR} ${scallopR} 0 0 0 ${x} ${sy + scallopR} `;
    }
    d += `L ${x} ${bottomSafe + 8} `;
    return d;
  }

  return {
    outer: makePath(0),
    inner: makePath(isCompact ? 6 : 8),
    leftEdge: makeEdgePath('left'),
    rightEdge: makeEdgePath('right'),
  };
}
