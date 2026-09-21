import React, { useState, useEffect } from 'react';
import { View, Image, ActivityIndicator } from 'react-native';

export interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

export const QRCodeDisplay = ({ value, size = 150 }: QRCodeDisplayProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    import('qrcode')
      .then((QRCode) => {
        QRCode.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: 'M' })
          .then((url) => {
            if (active) setQrDataUrl(url);
          })
          .catch((err) => {
            console.error('Failed to generate QR code:', err);
          });
      })
      .catch((err) => {
        console.error('Failed to load qrcode library:', err);
      });
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!qrDataUrl) {
    return (
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F3F8', borderRadius: 8 }}>
        <ActivityIndicator size="small" color="#5E43F3" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: qrDataUrl }}
      style={{ width: size, height: size, borderRadius: 8 }}
      resizeMode="contain"
    />
  );
};

export default QRCodeDisplay;
