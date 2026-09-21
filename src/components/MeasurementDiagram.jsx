import React from 'react';

/**
 * SVG Diagram showing where to measure heart girth and body length
 * Simple cow silhouette with measurement indicators
 */
export default function MeasurementDiagram({ type = 'heartGirth', color = '#C62828' }) {
  if (type === 'heartGirth') {
    return (
      <svg viewBox="0 0 300 180" style={{width:'100%',maxWidth:340,height:'auto',display:'block',margin:'12px auto'}}>
        {/* Background circle behind measurement area */}
        <ellipse cx="130" cy="95" rx="55" ry="45" fill={color} fillOpacity="0.15" />
        
        {/* Cow body */}
        <ellipse cx="150" cy="100" rx="75" ry="45" fill="#F5DEB3" stroke="#8D6E63" strokeWidth="2" />
        
        {/* Cow head */}
        <ellipse cx="75" cy="85" rx="25" ry="22" fill="#F5DEB3" stroke="#8D6E63" strokeWidth="2" />
        
        {/* Ear */}
        <ellipse cx="60" cy="70" rx="8" ry="5" fill="#F5DEB3" stroke="#8D6E63" strokeWidth="1.5" transform="rotate(-30 60 70)" />
        
        {/* Horns (optional) */}
        <path d="M 65 68 Q 60 55 70 50" fill="none" stroke="#8D6E63" strokeWidth="2" strokeLinecap="round" />
        
        {/* Eye */}
        <circle cx="82" cy="82" r="2.5" fill="#333" />
        
        {/* Muzzle */}
        <ellipse cx="52" cy="92" rx="8" ry="6" fill="#FFB6C1" stroke="#8D6E63" strokeWidth="1" />
        
        {/* Legs */}
        <rect x="90" y="135" width="12" height="35" fill="#F5DEB3" stroke="#8D6E63" strokeWidth="2" rx="3" />
        <rect x="120" y="140" width="12" height="30" fill="#F5DEB3" stroke="#8D6E63" strokeWidth="2" rx="3" />
        <rect x="170" y="140" width="12" height="30" fill="#F5DEB3" stroke="#8D6E63" strokeWidth="2" rx="3" />
        <rect x="200" y="135" width="12" height="35" fill="#F5DEB3" stroke="#8D6E63" strokeWidth="2" rx="3" />
        
        {/* Tail */}
        <path d="M 220 90 Q 240 95 245 130" fill="none" stroke="#8D6E63" strokeWidth="2" strokeLinecap="round" />
        
        {/* Udders */}
        <ellipse cx="155" cy="140" rx="15" ry="10" fill="#FFB6C1" stroke="#8D6E63" strokeWidth="1" />
        
        {/* Measurement tape (dashed line around girth) */}
        <path 
          d="M 130 55 L 130 145" 
          stroke={color} 
          strokeWidth="3" 
          strokeDasharray="6,4"
          strokeLinecap="round"
        />
        
        {/* Arrows on the tape */}
        <polygon points="130,50 125,58 135,58" fill={color} />
        <polygon points="130,150 125,142 135,142" fill={color} />
        
        {/* Label */}
        <text x="150" y="30" fontSize="14" fontWeight="bold" fill={color} textAnchor="middle">
          Heart Girth
        </text>
        <text x="150" y="46" fontSize="10" fill="#666" textAnchor="middle">
          Wrap around behind front legs
        </text>
        
        {/* Measurement number example */}
        <text x="280" y="100" fontSize="12" fontWeight="bold" fill={color} textAnchor="middle">
          ?
        </text>
        <text x="280" y="116" fontSize="10" fill="#666" textAnchor="middle">
          cm
        </text>
      </svg>
    );
  }

  if (type === 'bodyLength') {
    return (
      <svg viewBox="0 0 300 180" style={{width:'100%',maxWidth:340,height:'auto',display:'block',margin:'12px auto'}}>
        {/* Cow body */}
        <ellipse cx="150" cy="100" rx="75" ry="45" fill="#F5DEB3" stroke="#8D6E63" strokeWidth="2" />
        
        {/* Cow head */}
        <ellipse cx="75" cy="85" rx="25" ry="22" fill="#F5DEB3" stroke="#8D6E63" strokeWidth="2" />
        
        {/* Ear */}
        <ellipse cx="60" cy="70" rx="8" ry="5" fill="#F5DEB3" stroke="#8D6E63" strokeWidth="1.5" transform="rotate(-30 60 70)" />
        
        {/* Eye */}
        <circle cx="82" cy="82" r="2.5" fill="#333" />
        
        {/* Muzzle */}
        <ellipse cx="52" cy="92" rx="8" ry="6" fill="#FFB6C1" stroke="#8D6E63" strokeWidth="1" />
        
        {/* Legs */}
        <rect x="90" y="135" width="12" height="35" fill="#F5DEB3" stroke="#8D6E63" strokeWidth="2" rx="3" />
        <rect x="120" y="140" width="12" height="30" fill="#F5DEB3" stroke="#8D6E63" strokeWidth="2" rx="3" />
        <rect x="170" y="140" width="12" height="30" fill="#F5DEB3" stroke="#8D6E63" strokeWidth="2" rx="3" />
        <rect x="200" y="135" width="12" height="35" fill="#F5DEB3" stroke="#8D6E63" strokeWidth="2" rx="3" />
        
        {/* Tail */}
        <path d="M 220 90 Q 240 95 245 130" fill="none" stroke="#8D6E63" strokeWidth="2" strokeLinecap="round" />
        
        {/* Udders */}
        <ellipse cx="155" cy="140" rx="15" ry="10" fill="#FFB6C1" stroke="#8D6E63" strokeWidth="1" />
        
        {/* Measurement line (shoulder to pin bone) */}
        <line 
          x1="95" 
          y1="60" 
          x2="215" 
          y2="60" 
          stroke={color} 
          strokeWidth="3" 
          strokeDasharray="6,4"
          strokeLinecap="round"
        />
        
        {/* Arrow ends */}
        <polygon points="95,60 105,55 105,65" fill={color} />
        <polygon points="215,60 205,55 205,65" fill={color} />
        
        {/* Dotted pointers to landmarks */}
        <line x1="95" y1="60" x2="95" y2="90" stroke={color} strokeWidth="1" strokeDasharray="2,2" />
        <line x1="215" y1="60" x2="215" y2="90" stroke={color} strokeWidth="1" strokeDasharray="2,2" />
        
        {/* Landmark labels */}
        <text x="95" y="100" fontSize="9" fill="#666" textAnchor="middle">Shoulder</text>
        <text x="215" y="100" fontSize="9" fill="#666" textAnchor="middle">Pin bone</text>
        
        {/* Main label */}
        <text x="155" y="30" fontSize="14" fontWeight="bold" fill={color} textAnchor="middle">
          Body Length
        </text>
        <text x="155" y="46" fontSize="10" fill="#666" textAnchor="middle">
          Shoulder to pin bone (top of back)
        </text>
        
        {/* Measurement number example */}
        <text x="280" y="100" fontSize="12" fontWeight="bold" fill={color} textAnchor="middle">
          ?
        </text>
        <text x="280" y="116" fontSize="10" fill="#666" textAnchor="middle">
          cm
        </text>
      </svg>
    );
  }

  return null;
}
