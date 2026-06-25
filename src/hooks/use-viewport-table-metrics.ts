'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import { TABLE_METRICS } from '@/lib/ant-table-config';

type UseViewportTableMetricsOptions = {
  bottomGap?: number;
  withScrollY?: boolean;
};

function getAvailableBodyHeight(el: HTMLElement, bottomGap: number): number {
  const rect = el.getBoundingClientRect();
  const fromViewport = window.innerHeight - rect.top - bottomGap;
  const fromElement = el.clientHeight;

  return Math.max(fromViewport, fromElement);
}

export function useViewportTableMetrics(
  dataLength: number,
  options: UseViewportTableMetricsOptions = {},
) {
  const {
    bottomGap = TABLE_METRICS.VIEWPORT_BOTTOM_GAP,
    withScrollY = true,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState(10);
  const [scrollY, setScrollY] = useState(
    TABLE_METRICS.ROW_HEIGHT * TABLE_METRICS.PAGE_SIZE_MIN,
  );

  useLayoutEffect(() => {
    const update = () => {
      const el = containerRef.current;
      if (!el) return;

      const available = getAvailableBodyHeight(el, bottomGap);
      const paginationReserve =
        dataLength > TABLE_METRICS.PAGE_SIZE_MIN
          ? TABLE_METRICS.PAGINATION_HEIGHT
          : 0;
      const bodySpace =
        available -
        TABLE_METRICS.TABLE_HEAD_HEIGHT -
        TABLE_METRICS.TABLE_WRAPPER_PADDING -
        paginationReserve;

      const rows =
        Math.floor(bodySpace / TABLE_METRICS.ROW_HEIGHT) -
        TABLE_METRICS.ROW_SAFETY_MARGIN;
      const nextPageSize = Math.max(
        TABLE_METRICS.PAGE_SIZE_MIN,
        Math.min(rows || TABLE_METRICS.PAGE_SIZE_MIN, TABLE_METRICS.PAGE_SIZE_MAX),
      );

      setPageSize(nextPageSize);
      if (withScrollY) {
        setScrollY(
          Math.max(TABLE_METRICS.ROW_HEIGHT * TABLE_METRICS.PAGE_SIZE_MIN, bodySpace),
        );
      }
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(document.documentElement);

    const el = containerRef.current;
    if (el) {
      observer.observe(el);
      let parent = el.parentElement;
      while (parent) {
        observer.observe(parent);
        if (parent.dataset.slot === 'card') break;
        parent = parent.parentElement;
      }
    }

    window.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [bottomGap, dataLength, withScrollY]);

  return { containerRef, pageSize, scrollY };
}
