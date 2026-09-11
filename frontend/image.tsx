import React from 'react';
export default function Image({priority, fill, sizes, ...props}: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean; fill?: boolean }) {
  return <img {...props} sizes={sizes} loading={priority ? 'eager' : 'lazy'} decoding="async" style={{...props.style, ...(fill ? {position:'absolute', inset:0, width:'100%', height:'100%'} : {})}} />;
}
