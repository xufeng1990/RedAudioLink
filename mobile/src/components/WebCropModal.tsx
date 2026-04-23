import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Colors } from '../theme/colors';

interface Props {
  src: string | null;
  onCancel: () => void;
  onConfirm: (croppedDataUrl: string) => void;
}

export default function WebCropModal({ src, onCancel, onConfirm }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState<{ x: number; y: number; size: number }>({ x: 0, y: 0, size: 0 });
  const dragRef = useRef<{ startX: number; startY: number; bx: number; by: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; bSize: number } | null>(null);

  useEffect(() => {
    if (!src) {
      setImgSize(null);
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      const maxW = Math.min(window.innerWidth - 40, 420);
      const maxH = Math.min(window.innerHeight - 220, 520);
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = img.width * scale;
      const h = img.height * scale;
      setImgSize({ w, h });
      const size = Math.min(w, h) * 0.85;
      setBox({ x: (w - size) / 2, y: (h - size) / 2, size });
    };
    img.src = src;
  }, [src]);

  if (Platform.OS !== 'web' || !src) return null;

  const startDrag = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    const point = e.touches ? e.touches[0] : e;
    dragRef.current = { startX: point.clientX, startY: point.clientY, bx: box.x, by: box.y };
  };

  const startResize = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    const point = e.touches ? e.touches[0] : e;
    resizeRef.current = { startX: point.clientX, startY: point.clientY, bSize: box.size };
  };

  const onMove = (e: any) => {
    if (!imgSize) return;
    const point = e.touches ? e.touches[0] : e;
    if (dragRef.current) {
      const dx = point.clientX - dragRef.current.startX;
      const dy = point.clientY - dragRef.current.startY;
      const nx = Math.max(0, Math.min(imgSize.w - box.size, dragRef.current.bx + dx));
      const ny = Math.max(0, Math.min(imgSize.h - box.size, dragRef.current.by + dy));
      setBox((b) => ({ ...b, x: nx, y: ny }));
    } else if (resizeRef.current) {
      const dx = point.clientX - resizeRef.current.startX;
      const dy = point.clientY - resizeRef.current.startY;
      const delta = Math.max(dx, dy);
      const minSize = 60;
      const maxSize = Math.min(imgSize.w - box.x, imgSize.h - box.y);
      const newSize = Math.max(minSize, Math.min(maxSize, resizeRef.current.bSize + delta));
      setBox((b) => ({ ...b, size: newSize }));
    }
  };

  const endDrag = () => {
    dragRef.current = null;
    resizeRef.current = null;
  };

  const handleConfirm = () => {
    if (!imgSize) return;
    const img = new window.Image();
    img.onload = () => {
      const ratio = img.width / imgSize.w;
      const sx = box.x * ratio;
      const sy = box.y * ratio;
      const sSize = box.size * ratio;
      const canvas = document.createElement('canvas');
      const out = Math.min(sSize, 1600);
      canvas.width = out;
      canvas.height = out;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, out, out);
      onConfirm(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = src;
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Crop Image (1:1)</Text>
          <Text style={styles.hint}>Drag the box to reposition · Drag corner to resize</Text>
          {imgSize && (
            <div
              ref={containerRef as any}
              style={{
                position: 'relative',
                width: imgSize.w,
                height: imgSize.h,
                marginTop: 12,
                userSelect: 'none',
                touchAction: 'none',
              }}
              onMouseMove={onMove}
              onMouseUp={endDrag}
              onMouseLeave={endDrag}
              onTouchMove={onMove}
              onTouchEnd={endDrag}
            >
              <img
                ref={imgRef as any}
                src={src}
                style={{ width: imgSize.w, height: imgSize.h, display: 'block', pointerEvents: 'none' }}
              />
              <div
                onMouseDown={startDrag}
                onTouchStart={startDrag}
                style={{
                  position: 'absolute',
                  left: box.x,
                  top: box.y,
                  width: box.size,
                  height: box.size,
                  border: '2px solid #ED1C29',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                  cursor: 'move',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  onMouseDown={startResize}
                  onTouchStart={startResize}
                  style={{
                    position: 'absolute',
                    right: -8,
                    bottom: -8,
                    width: 18,
                    height: 18,
                    background: '#ED1C29',
                    borderRadius: 3,
                    cursor: 'nwse-resize',
                  }}
                />
              </div>
            </div>
          )}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Crop</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', maxWidth: 460 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.text },
  hint: { fontSize: 12, color: '#888', marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: 14, gap: 12 },
  cancelBtn: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 6, backgroundColor: '#EFEFEF' },
  cancelText: { color: '#444', fontWeight: '600' },
  confirmBtn: { paddingHorizontal: 26, paddingVertical: 10, borderRadius: 6, backgroundColor: Colors.primary },
  confirmText: { color: '#fff', fontWeight: '600' },
});
