import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';

interface SvgIllustrationProps {
  name: string;
  width?: number;
  height?: number;
  style?: any;
}

export function SvgIllustration({ name, width = 200, height = 150, style }: SvgIllustrationProps) {
  const getIllustrationSvg = (illustrationName: string): string => {
    const illustrations: { [key: string]: string } = {
      'family-reading': `
        <svg width="300" height="200" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
          <!-- Family group reading together -->
          <g transform="translate(50, 40)">
            <!-- Parent (center) -->
            <ellipse cx="100" cy="100" rx="25" ry="35" fill="#4A90E2"/>
            <circle cx="100" cy="60" r="25" fill="#FDBCB4"/>
            <path d="M 80 45 Q 100 25 120 45 Q 115 35 100 35 Q 85 35 80 45" fill="#D2691E"/>
            <circle cx="95" cy="55" r="3" fill="#333"/>
            <circle cx="105" cy="55" r="3" fill="#333"/>
            <path d="M 90 70 Q 100 75 110 70" stroke="#333" stroke-width="2" fill="none"/>
            
            <!-- Child 1 (left) -->
            <ellipse cx="50" cy="120" rx="20" ry="30" fill="#FFB6C1"/>
            <circle cx="50" cy="90" r="20" fill="#FDBCB4"/>
            <circle cx="50" cy="80" r="18" fill="#2F4F4F"/>
            <circle cx="46" cy="87" r="2" fill="#333"/>
            <circle cx="54" cy="87" r="2" fill="#333"/>
            <path d="M 45 95 Q 50 98 55 95" stroke="#333" stroke-width="1" fill="none"/>
            
            <!-- Child 2 (right) -->
            <ellipse cx="150" cy="120" rx="20" ry="30" fill="#F39C12"/>
            <circle cx="150" cy="90" r="20" fill="#8B4513"/>
            <circle cx="150" cy="80" r="18" fill="#2F4F4F"/>
            <circle cx="146" cy="87" r="2" fill="#333"/>
            <circle cx="154" cy="87" r="2" fill="#333"/>
            <path d="M 145 95 Q 150 98 155 95" stroke="#333" stroke-width="1" fill="none"/>
            
            <!-- Book -->
            <rect x="85" y="40" width="30" height="20" rx="2" fill="#8B4513"/>
            <rect x="87" y="42" width="26" height="16" rx="1" fill="#FFF"/>
            <line x1="90" y1="45" x2="110" y2="45" stroke="#333" stroke-width="1"/>
            <line x1="90" y1="48" x2="110" y2="48" stroke="#333" stroke-width="1"/>
            <line x1="90" y1="51" x2="105" y2="51" stroke="#333" stroke-width="1"/>
          </g>
        </svg>
      `,
      'screen-time-family': `
        <svg width="300" height="200" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
          <!-- Family group -->
          <g transform="translate(50, 40)">
            <!-- Parent (center) -->
            <ellipse cx="100" cy="100" rx="25" ry="35" fill="#4A90E2"/>
            <circle cx="100" cy="60" r="25" fill="#FDBCB4"/>
            <path d="M 80 45 Q 100 25 120 45 Q 115 35 100 35 Q 85 35 80 45" fill="#D2691E"/>
            <circle cx="95" cy="55" r="3" fill="#333"/>
            <circle cx="105" cy="55" r="3" fill="#333"/>
            <path d="M 90 70 Q 100 75 110 70" stroke="#333" stroke-width="2" fill="none"/>
            
            <!-- Child 1 (left) -->
            <ellipse cx="50" cy="120" rx="20" ry="30" fill="#FFB6C1"/>
            <circle cx="50" cy="90" r="20" fill="#FDBCB4"/>
            <circle cx="50" cy="80" r="18" fill="#2F4F4F"/>
            <circle cx="46" cy="87" r="2" fill="#333"/>
            <circle cx="54" cy="87" r="2" fill="#333"/>
            <path d="M 45 95 Q 50 98 55 95" stroke="#333" stroke-width="1" fill="none"/>
            
            <!-- Child 2 (right) -->
            <ellipse cx="150" cy="120" rx="20" ry="30" fill="#F39C12"/>
            <circle cx="150" cy="90" r="20" fill="#8B4513"/>
            <circle cx="150" cy="80" r="18" fill="#2F4F4F"/>
            <circle cx="146" cy="87" r="2" fill="#333"/>
            <circle cx="154" cy="87" r="2" fill="#333"/>
            <path d="M 145 95 Q 150 98 155 95" stroke="#333" stroke-width="1" fill="none"/>
            
            <!-- Heart above family -->
            <path d="M 100 20 Q 95 15 90 20 Q 90 25 100 35 Q 110 25 110 20 Q 105 15 100 20" fill="#FF6B6B"/>
          </g>
        </svg>
      `,
      'tina-bruno': `
        <svg width="300" height="200" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
          <!-- Tina Character -->
          <g transform="translate(50, 50)">
            <ellipse cx="30" cy="80" rx="25" ry="35" fill="#FFB6C1"/>
            <circle cx="30" cy="35" r="25" fill="#FDBCB4"/>
            <path d="M 10 25 Q 30 5 50 25 Q 45 15 30 15 Q 15 15 10 25" fill="#F4D03F"/>
            <circle cx="25" cy="30" r="3" fill="#333"/>
            <circle cx="35" cy="30" r="3" fill="#333"/>
            <path d="M 22 40 Q 30 45 38 40" stroke="#333" stroke-width="2" fill="none"/>
            <line x1="60" y1="30" x2="75" y2="15" stroke="#8B4513" stroke-width="3"/>
            <polygon points="75,15 78,12 81,15 78,18" fill="#FFD700"/>
            <text x="80" y="20" font-family="Arial" font-size="12" fill="#FFD700">✨</text>
          </g>
          
          <!-- Bruno Character -->
          <g transform="translate(180, 50)">
            <ellipse cx="30" cy="80" rx="25" ry="35" fill="#4A90E2"/>
            <circle cx="30" cy="35" r="25" fill="#8B4513"/>
            <circle cx="30" cy="25" r="20" fill="#2F4F4F"/>
            <circle cx="25" cy="30" r="3" fill="#333"/>
            <circle cx="35" cy="30" r="3" fill="#333"/>
            <path d="M 22 40 Q 30 45 38 40" stroke="#333" stroke-width="2" fill="none"/>
            <ellipse cx="65" cy="70" rx="8" ry="20" fill="#FF6B6B"/>
            <polygon points="65,50 60,45 70,45" fill="#FFD700"/>
            <circle cx="65" cy="65" r="3" fill="#FFF"/>
          </g>
          
          <!-- Names -->
          <text x="65" y="180" font-family="Comic Sans MS, cursive" font-size="16" fill="#333" text-anchor="middle">Tina</text>
          <text x="195" y="180" font-family="Comic Sans MS, cursive" font-size="16" fill="#333" text-anchor="middle">Bruno</text>
        </svg>
      `,
      'voice-recording': `
        <svg width="300" height="200" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
          <!-- Woman character -->
          <g transform="translate(100, 30)">
            <ellipse cx="50" cy="120" rx="30" ry="40" fill="#F39C12"/>
            <circle cx="50" cy="60" r="30" fill="#D2691E"/>
            <path d="M 25 45 Q 50 20 75 45 Q 70 35 50 35 Q 30 35 25 45" fill="#8B4513"/>
            <circle cx="42" cy="55" r="3" fill="#333"/>
            <circle cx="58" cy="55" r="3" fill="#333"/>
            <path d="M 40 70 Q 50 75 60 70" stroke="#333" stroke-width="2" fill="none"/>
            <rect x="80" y="80" width="15" height="25" rx="3" fill="#333"/>
            <rect x="82" y="82" width="11" height="21" rx="2" fill="#4A90E2"/>
            <path d="M 100 85 Q 110 85 110 95 Q 110 105 100 105" stroke="#FF6B6B" stroke-width="2" fill="none"/>
            <path d="M 105 80 Q 120 80 120 95 Q 120 110 105 110" stroke="#FF6B6B" stroke-width="2" fill="none"/>
            <path d="M 110 75 Q 130 75 130 95 Q 130 115 110 115" stroke="#FF6B6B" stroke-width="2" fill="none"/>
          </g>
        </svg>
      `,
      'research-backed': `
        <svg width="300" height="200" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
          <!-- Mother and child -->
          <g transform="translate(100, 40)">
            <ellipse cx="50" cy="100" rx="25" ry="35" fill="#F39C12"/>
            <circle cx="50" cy="50" r="25" fill="#D2691E"/>
            <path d="M 30 35 Q 50 15 70 35 Q 65 25 50 25 Q 35 25 30 35" fill="#8B4513"/>
            <path d="M 42 45 Q 45 42 48 45" stroke="#333" stroke-width="2" fill="none"/>
            <path d="M 52 45 Q 55 42 58 45" stroke="#333" stroke-width="2" fill="none"/>
            <path d="M 40 60 Q 50 65 60 60" stroke="#333" stroke-width="2" fill="none"/>
            
            <!-- Child -->
            <circle cx="70" cy="80" r="15" fill="#FDBCB4"/>
            <circle cx="70" cy="70" r="12" fill="#F4D03F"/>
            <path d="M 66 68 Q 68 66 70 68" stroke="#333" stroke-width="1" fill="none"/>
            <path d="M 70 68 Q 72 66 74 68" stroke="#333" stroke-width="1" fill="none"/>
            <path d="M 66 75 Q 70 78 74 75" stroke="#333" stroke-width="1" fill="none"/>
            
            <!-- Heart symbol -->
            <path d="M 20 30 Q 15 25 10 30 Q 10 35 20 45 Q 30 35 30 30 Q 25 25 20 30" fill="#FF6B6B"/>
          </g>
        </svg>
      `,
    };

    return illustrations[illustrationName] || illustrations['tina-bruno'];
  };

  return (
    <View style={[styles.container, style]}>
      <SvgXml xml={getIllustrationSvg(name)} width={width} height={height} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
