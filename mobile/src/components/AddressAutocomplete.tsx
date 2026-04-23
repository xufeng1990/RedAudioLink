import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../theme/colors';

export interface AddressSelection {
  address: string;
  state: string;
  postcode: string;
}

// Photon GeoJSON feature returned by komoot
interface PhotonFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    type?: string;
  };
}

interface PhotonResponse {
  type: 'FeatureCollection';
  features: PhotonFeature[];
}

// Australia bounding box
const AU_BBOX = '112.92,-44.06,153.64,-10.68';

const AU_STATE_ABBR: Record<string, string> = {
  'New South Wales': 'NSW',
  'Victoria': 'VIC',
  'Queensland': 'QLD',
  'Western Australia': 'WA',
  'South Australia': 'SA',
  'Tasmania': 'TAS',
  'Australian Capital Territory': 'ACT',
  'Northern Territory': 'NT',
};

const stateAbbr = (full?: string) => (full ? AU_STATE_ABBR[full] || full : '');

const featureLine = (f: PhotonFeature) => {
  const p = f.properties;
  const streetParts = [p.housenumber, p.street].filter(Boolean);
  const street = streetParts.join(' ');
  const suburb = p.suburb || p.district || p.city || p.county || '';
  const state = stateAbbr(p.state);
  const primary = street || p.name || suburb || '';
  const secondary = [street ? suburb : '', state, 'Australia']
    .filter(Boolean)
    .join(', ');
  const addressLine = [street, suburb].filter(Boolean).join(', ') || primary;
  return { primary, secondary, addressLine, state, postcode: p.postcode || '' };
};

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  onSelect: (s: AddressSelection) => void;
  placeholder?: string;
  testID?: string;
}

export default function AddressAutocomplete({ value, onChangeText, onSelect, placeholder, testID }: Props) {
  const [results, setResults] = useState<PhotonFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef('');
  const justSelectedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    const q = value.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }

    if (q.length < 3) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      lastQueryRef.current = q;
      const controller = new AbortController();
      abortRef.current = controller;
      timeoutRef.current = setTimeout(() => controller.abort(), 8000);
      setLoading(true);
      try {
        // Photon: free autocomplete API, Australia-filtered via bounding box + countrycode
        const url =
          `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}` +
          `&limit=6&lang=en&bbox=${AU_BBOX}&layer=house&layer=street`;
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        });
        const data: PhotonResponse = await res.json();
        const features = (data?.features ?? []).filter(
          (f) => f.properties.country === 'Australia' || !f.properties.country,
        );
        if (lastQueryRef.current === q) {
          setResults(features);
          setOpen(features.length > 0);
        }
      } catch {
        if (lastQueryRef.current === q) setResults([]);
      } finally {
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
        if (abortRef.current === controller) { abortRef.current = null; setLoading(false); }
      }
    }, 350);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handlePick = (f: PhotonFeature) => {
    const { addressLine, state, postcode } = featureLine(f);
    justSelectedRef.current = true;
    onChangeText(addressLine);
    onSelect({ address: addressLine, state, postcode });
    setOpen(false);
    setResults([]);
  };

  return (
    <View style={{ position: 'relative', zIndex: 10 }}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder || 'Start typing an Australian address...'}
          placeholderTextColor="#BFBFBF"
          testID={testID}
          autoCorrect={false}
          autoCapitalize="words"
        />
        {loading && <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 8 }} />}
      </View>

      {open && results.length > 0 && (
        <View style={styles.dropdown}>
          {results.map((f, i) => {
            const { primary, secondary } = featureLine(f);
            return (
              <TouchableOpacity
                key={`${i}`}
                style={[styles.row, i === results.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => handlePick(f)}
                activeOpacity={0.7}
                testID={`address-suggestion-${i}`}
              >
                <View style={styles.pin}>
                  <View style={styles.pinDot} />
                  <View style={styles.pinTail} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.primary} numberOfLines={1}>{primary}</Text>
                  {!!secondary && <Text style={styles.secondary} numberOfLines={1}>{secondary}</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    overflow: 'hidden',
    zIndex: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pin: { width: 22, alignItems: 'center', marginRight: 10 },
  pinDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.6, borderColor: '#888', backgroundColor: '#fff' },
  pinTail: { width: 0, height: 0, borderLeftWidth: 3, borderRightWidth: 3, borderTopWidth: 4, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#888', marginTop: -1 },
  primary: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  secondary: { fontSize: 12, color: '#888', marginTop: 1 },
});
