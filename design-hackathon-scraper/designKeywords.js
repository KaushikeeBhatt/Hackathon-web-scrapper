// designKeywords.js
const designKeywords = [
  // Core design terms
  'design',
  'ui',
  'ux',
  'ui/ux',
  'user interface',
  'user experience',
  'graphic design',
  'visual design',
  'web design',
  'mobile design',
  'app design',
  'interface design',
  'product design',
  'brand design',
  'logo design',
  'poster design',
  'banner design',
  
  // Design tools
  'figma',
  'adobe',
  'photoshop',
  'illustrator',
  'sketch',
  'invision',
  'zeplin',
  'principle',
  'framer',
  'protopie',
  'marvel',
  'balsamiq',
  'wireframe',
  
  // Design concepts
  'mockup',
  'prototype',
  'prototyping',
  'wireframing',
  'illustration',
  'icon design',
  'typography',
  'color theory',
  'layout',
  'composition',
  'visual hierarchy',
  'responsive design',
  'accessible design',
  'inclusive design',
  
  // Creative terms
  'creative',
  'artistic',
  'visual',
  'aesthetic',
  'beautiful',
  'modern',
  'minimalist',
  'clean design',
  'pixel perfect',
  
  // Design categories
  'designing',
  'drawing',
  'painting',
  'digital art',
  'vector art',
  '3d design',
  'animation',
  'motion design',
  'interactive design',
  'game design',
  'fashion design',
  'industrial design',
  'architectural design',
  
  // Frontend/UI development
  'frontend',
  'css',
  'html',
  'javascript',
  'react',
  'vue',
  'angular',
  'bootstrap',
  'tailwind',
  'material design',
  'design system'
];

// Function to check if a hackathon is design-related
function isDesignHackathon(hackathon) {
  const textToCheck = [
    hackathon.title || '',
    hackathon.description || '',
    hackathon.tags?.join(' ') || '',
    hackathon.host || '',
    hackathon.hostedBy || ''
  ].join(' ').toLowerCase();
  
  return designKeywords.some(keyword => 
    textToCheck.includes(keyword.toLowerCase())
  );
}

// Function to get design relevance score (0-1)
function getDesignRelevanceScore(hackathon) {
  const textToCheck = [
    hackathon.title || '',
    hackathon.description || '',
    hackathon.tags?.join(' ') || '',
    hackathon.host || '',
    hackathon.hostedBy || ''
  ].join(' ').toLowerCase();
  
  const matches = designKeywords.filter(keyword => 
    textToCheck.includes(keyword.toLowerCase())
  );
  
  return matches.length / designKeywords.length;
}

module.exports = {
  designKeywords,
  isDesignHackathon,
  getDesignRelevanceScore
};
