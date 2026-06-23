'use client';

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { IconSearch, IconX } from '@tabler/icons-react';
import SvgIcon from '@/components/SvgIcon';
import type { IconCategory, IconPreset } from '@/lib/iconPresets';

interface IconFieldProps {
  value: string;
  fallback: string;
  presets: IconPreset[];
  inputClassName: string;
  onChange: (value: string) => void;
}

type PickerBounds = {
  left: number;
  top: number;
  width: number;
  listMaxHeight: number;
};

const PICKER_MAX_WIDTH = 352;
const PICKER_MIN_WIDTH = 288;
const VIEWPORT_MARGIN = 16;
const PICKER_GAP = 6;

export default function IconField({
  value,
  fallback,
  presets,
  inputClassName,
  onChange,
}: IconFieldProps) {
  const pickerId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [remoteIcons, setRemoteIcons] = useState<IconPreset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pickerBounds, setPickerBounds] = useState<PickerBounds>({
    left: VIEWPORT_MARGIN,
    top: VIEWPORT_MARGIN,
    width: PICKER_MIN_WIDTH,
    listMaxHeight: 256,
  });

  const categories = useMemo(() => {
    const categorySet = new Set<IconCategory>();
    presets.forEach((preset) => categorySet.add(preset.category));
    return Array.from(categorySet);
  }, [presets]);

  const [activeCategory, setActiveCategory] = useState<IconCategory>('General');

  useEffect(() => {
    if (categories.length === 0) return;
    if (!categories.includes(activeCategory)) setActiveCategory(categories[0]);
  }, [activeCategory, categories]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;

      const width = Math.min(
        PICKER_MAX_WIDTH,
        Math.max(PICKER_MIN_WIDTH, Math.min(rect.width, window.innerWidth - VIEWPORT_MARGIN * 2)),
      );
      const left = Math.min(
        Math.max(rect.left, VIEWPORT_MARGIN),
        window.innerWidth - width - VIEWPORT_MARGIN,
      );
      const availableBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
      const availableAbove = rect.top - VIEWPORT_MARGIN;
      const openAbove = availableBelow < 320 && availableAbove > availableBelow;
      const availableHeight = Math.max(220, openAbove ? availableAbove : availableBelow);
      const top = openAbove
        ? Math.max(VIEWPORT_MARGIN, rect.top - Math.min(360, availableHeight) - PICKER_GAP)
        : Math.min(rect.bottom + PICKER_GAP, window.innerHeight - VIEWPORT_MARGIN);

      setPickerBounds({
        left,
        top,
        width,
        listMaxHeight: Math.max(160, Math.min(256, availableHeight - 104)),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        !rootRef.current?.contains(target)
        && !pickerRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.setTimeout(() => searchRef.current?.focus(), 0);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      setRemoteIcons([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);

      try {
        const response = await fetch(`/api/icons/search?q=${encodeURIComponent(normalizedQuery)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;

        const data = await response.json();
        const icons = Array.isArray(data.icons) ? data.icons : [];
        setRemoteIcons(icons.filter(isIconPreset));
      } catch (error) {
        if (!controller.signal.aborted) setRemoteIcons([]);
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const visibleIcons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery) {
      return dedupeIcons([
        ...presets.filter((preset) => matchesIcon(preset, normalizedQuery)),
        ...remoteIcons,
      ]);
    }

    return presets.filter((preset) => preset.category === activeCategory);
  }, [activeCategory, presets, query, remoteIcons]);

  const selectIcon = (preset: IconPreset) => {
    onChange(preset.svg);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className={`relative ${isOpen ? 'z-[9999]' : ''}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm border border-border-light bg-surface-elevated text-text-secondary transition-colors hover:border-border-medium hover:bg-surface-sunken hover:text-text-primary"
          aria-expanded={isOpen}
          aria-controls={pickerId}
          aria-label="Choose icon"
          title="Choose icon"
        >
          <SvgIcon svg={value} fallback={fallback} className="h-4 w-4" />
        </button>
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Custom SVG"
          className={`${inputClassName} min-w-0 flex-1`}
          aria-label="Custom SVG icon"
        />
      </div>

      {isOpen && createPortal((
        <div
          id={pickerId}
          ref={pickerRef}
          data-overlay
          className="fixed z-[9999] rounded-sm border border-border-light bg-surface-elevated shadow-[0_16px_40px_rgba(0,0,0,0.12)]"
          style={{
            left: pickerBounds.left,
            top: pickerBounds.top,
            width: pickerBounds.width,
          }}
        >
          <div className="border-b border-border-light p-2">
            <div className="relative">
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search all icons"
                className="h-8 w-full rounded-sm border border-border-light bg-surface-elevated px-2 pr-8 text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-border-strong focus:ring-0"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-text-muted hover:text-text-primary"
                  aria-label="Clear icon search"
                >
                  <IconX className="h-3.5 w-3.5" />
                </button>
              ) : (
                <IconSearch className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              )}
            </div>
            <div className="mt-2 flex gap-1 overflow-x-auto pb-0.5">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`h-6 flex-shrink-0 rounded-sm px-2 text-[11px] transition-colors ${
                    activeCategory === category
                      ? 'bg-ink-900 text-background'
                      : 'bg-surface-sunken text-text-secondary hover:bg-border-light hover:text-text-primary'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div
            className="grid grid-cols-8 gap-1 overflow-y-auto p-2"
            style={{ maxHeight: pickerBounds.listMaxHeight }}
          >
            {visibleIcons.map((preset) => {
              const isSelected = value.trim() === preset.svg.trim();

              return (
                <button
                  key={`${preset.category}-${preset.id}`}
                  type="button"
                  onClick={() => selectIcon(preset)}
                  className={`flex h-8 w-8 items-center justify-center rounded-sm border transition-colors ${
                    isSelected
                      ? 'border-border-strong bg-surface-sunken text-text-primary'
                      : 'border-transparent text-text-tertiary hover:border-border-light hover:bg-surface-sunken hover:text-text-primary'
                  }`}
                  aria-label={`Use ${preset.label} icon`}
                  title={preset.label}
                >
                  <SvgIcon svg={preset.svg} fallback={fallback} className="h-4 w-4" />
                </button>
              );
            })}
          </div>

          {visibleIcons.length === 0 && (
            <div className="px-3 pb-3 text-xs text-text-tertiary">
              {isSearching ? 'Searching' : 'No icons'}
            </div>
          )}
        </div>
      ), document.body)}
    </div>
  );
}

function matchesIcon(preset: IconPreset, query: string) {
  return [
    preset.id,
    preset.label,
    preset.category,
    ...(preset.tags || []),
  ].join(' ').toLowerCase().includes(query);
}

function dedupeIcons(icons: IconPreset[]) {
  const seen = new Set<string>();
  const result: IconPreset[] = [];

  icons.forEach((icon) => {
    const keys = iconDedupeKeys(icon);
    if (keys.some((key) => seen.has(key))) return;
    keys.forEach((key) => seen.add(key));
    result.push(icon);
  });

  return result;
}

function iconDedupeKeys(icon: IconPreset) {
  const keys = new Set<string>();
  const normalizedId = icon.id.trim().toLowerCase().replace(/^simple-/, '');
  if (normalizedId) keys.add(`id:${normalizedId}`);

  const pathMatch = icon.svg.match(/\sd=(["'])(.*?)\1/i);
  const path = pathMatch?.[2]?.replace(/\s+/g, ' ').trim();
  if (path) keys.add(`path:${path}`);

  const normalizedSvg = icon.svg.replace(/\s+/g, ' ').trim();
  if (normalizedSvg) keys.add(`svg:${normalizedSvg}`);

  return Array.from(keys);
}

function isIconPreset(value: unknown): value is IconPreset {
  return Boolean(
    value
      && typeof value === 'object'
      && typeof (value as IconPreset).id === 'string'
      && typeof (value as IconPreset).label === 'string'
      && typeof (value as IconPreset).svg === 'string',
  );
}
