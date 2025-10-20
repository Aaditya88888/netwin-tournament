import React from "react";
import logo from "../assets/netwin-logo.png";

export function Logo() {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log('Logo image failed to load from assets, trying public folder');
    setImageError(true);
    // Fallback to public folder logo if assets version fails
    e.currentTarget.src = "/netwin-logo.png";
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    console.log('Logo image loaded successfully');
  };

  // Fallback component if image fails to load
  const LogoFallback = () => (
    <div className="h-8 w-8 rounded mr-2 bg-primary flex items-center justify-center text-white font-bold text-sm">
      N
    </div>
  );

  return (
    <div className="flex items-center">
      {!imageError ? (
        <img 
          src={logo} 
          alt="Netwin Logo" 
          className={`h-8 w-8 rounded mr-2 bg-white object-contain transition-opacity duration-200 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading="lazy"
        />
      ) : (
        <img 
          src="/netwin-logo.png" 
          alt="Netwin Logo" 
          className="h-8 w-8 rounded mr-2 bg-white object-contain"
          onError={() => {
            console.log('Public folder logo also failed, using fallback');
            setImageError(true);
          }}
        />
      )}
      {imageError && <LogoFallback />}
      <span className="text-xl font-bold text-white">NETWIN</span>
    </div>
  );
}
