/**
 * MapLibreStarryBackground.js - Enhanced Version
 * A modular starfield and atmospheric glow for MapLibre Globe
 * Vanilla JavaScript implementation with improved corona effect
 */

class MapLibreStarryBackground {
  constructor(options = {}) {
    // Default configuration - simplified to only use blue
    this.config = {
      starCount: options.starCount || 1500,
      glowIntensity: options.glowIntensity || 1.0,
      // Simplified color scheme with only blue
      glowColors: {
        inner: "rgba(120, 180, 255, 0.9)",
        middle: "rgba(100, 150, 255, 0.7)",
        outer: "rgba(70, 120, 255, 0.4)",
        fade: "rgba(40, 80, 220, 0)"
      },
    };

    this.mapInstance = null;
    this.stars = [];
    this.lastBearing = 0;
    this.lastPitch = 0;
    this.lastCenter = null;
    this.glowGradientId = "globe-glow-gradient";
    this.coronaGradientId = "globe-corona-gradient";
    this.containers = {
      starfield: null,
      glow: null
    };
    this.elements = {
      starfieldSvg: null,
      glowSvg: null,
      glowCircle: null,
    };
  }

  /**
   * Setup the required DOM elements and attach to existing containers
   * @param {string} starfieldContainerId - DOM ID for starfield container
   * @param {string} glowContainerId - DOM ID for glow container
   */
  setupContainers(starfieldContainerId, glowContainerId) {
    // Get container elements
    this.containers.starfield = document.getElementById(starfieldContainerId);
    this.containers.glow = document.getElementById(glowContainerId);

    if (!this.containers.starfield || !this.containers.glow) {
      console.error("Starfield or glow container not found");
      return false;
    }

    // Set container styles if needed
    this.containers.starfield.style.position = "absolute";
    this.containers.starfield.style.top = "0";
    this.containers.starfield.style.left = "0";
    this.containers.starfield.style.width = "100%";
    this.containers.starfield.style.height = "100%";
    this.containers.starfield.style.zIndex = "1";
    this.containers.starfield.style.pointerEvents = "none";

    this.containers.glow.style.position = "absolute";
    this.containers.glow.style.top = "0";
    this.containers.glow.style.left = "0";
    this.containers.glow.style.width = "100%";
    this.containers.glow.style.height = "100%";
    this.containers.glow.style.zIndex = "2";
    this.containers.glow.style.pointerEvents = "none";

    return true;
  }

  /**
   * Create an SVG element with the given attributes
   * @param {string} type - The SVG element type to create
   * @param {Object} attributes - Key-value pairs of attributes to set
   * @param {string} ns - Namespace (defaults to SVG namespace)
   * @returns {SVGElement} - The created SVG element
   */
  createSvgElement(type, attributes = {}, ns = "http://www.w3.org/2000/svg") {
    const element = document.createElementNS(ns, type);

    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, value);
    }

    return element;
  }

  /**
   * Create the starfield using vanilla JavaScript
   */
  createStarfield() {
    if (!this.containers.starfield) return;

    // Clear any existing content
    this.containers.starfield.innerHTML = '';

    // Get dimensions
    const width = this.containers.starfield.clientWidth;
    const height = this.containers.starfield.clientHeight;

    // Create SVG element
    const svg = this.createSvgElement("svg", {
      width: width,
      height: height,
      viewBox: `0 0 ${width} ${height}`
    });
    svg.style.backgroundColor = "transparent";

    this.containers.starfield.appendChild(svg);
    this.elements.starfieldSvg = svg;

    // Random position function
    const randomStarPosition = () => {
      return {
        pos: {
          x: Math.random() * width,
          y: Math.random() * height,
          z: Math.random() * 50,
        },
        initialPos: {}, // Will store initial position for reference
        hue: 0.6,
        size: Math.random() * 2 + 0.5,
      };
    };

    // Convert HSL to RGB
    const hslToRgb = (h, s, l) => {
      let r, g, b;

      if (s === 0) {
        r = g = b = l; // achromatic
      } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }

      return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    };

    // Helper function to map range
    const mapRange = (value, inMin, inMax, outMin, outMax) => {
      return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    };

    // Generate star positions
    this.stars = []; // Reset global stars array
    for (let i = 0; i < this.config.starCount; i++) {
      const star = randomStarPosition();
      // Store initial position for reference during movement
      star.initialPos = { ...star.pos };
      const brightness = Math.random() * 0.6 + 0.4;
      star.color = hslToRgb(star.hue, 0.2, brightness);
      star.element = null; // Will store reference to DOM element
      this.stars.push(star);
    }

    // Sort stars by z-coordinate
    this.stars.sort((a, b) => a.pos.z - b.pos.z);

    // Create star elements
    this.stars.forEach(star => {
      const circle = this.createSvgElement("circle", {
        class: "star",
        cx: star.pos.x,
        cy: star.pos.y,
        r: star.size,
        fill: star.color,
        opacity: mapRange(star.pos.z, 0, 50, 0.4, 1)
      });

      star.element = circle;
      svg.appendChild(circle);

    });

    return svg;
  }

  /**
   * Create the globe glow and corona effects
   */
  createGlobeGlow() {
    if (!this.containers.glow) return;

    // Clear existing content
    this.containers.glow.innerHTML = '';

    // Get dimensions
    const width = this.containers.glow.clientWidth;
    const height = this.containers.glow.clientHeight;

    // Create SVG element
    const svg = this.createSvgElement("svg", {
      width: width,
      height: height,
      viewBox: `0 0 ${width} ${height}`
    });
    svg.style.backgroundColor = "transparent";

    this.containers.glow.appendChild(svg);
    this.elements.glowSvg = svg;

    // Create defs for the gradients
    const defs = this.createSvgElement("defs");
    svg.appendChild(defs);

    // Create the gradients
    this.updateGlowGradient(defs);

    // Calculate initial radius based on current map state or fallback to viewport size
    let initialRadius;
    if (this.mapInstance) {
      initialRadius = this.calculateGlowRadius(this.mapInstance);
    } else {
      // Fallback calculation if no map instance is available yet
      const viewportSize = Math.min(width, height);
      initialRadius = viewportSize * 0.35; // 35% of the viewport
    }

    // Calculate corona radius (slightly larger than the globe itself)
    const coronaRadius = initialRadius * 1.01;

    // Create the corona effect - ENHANCED VERSION WITH MULTIPLE LAYERS
    this.createEnhancedCorona(svg, width, height, coronaRadius);

    // Create the glow circle
    const glowCircle = this.createSvgElement("circle", {
      class: "globe-glow",
      cx: width / 2,
      cy: height / 2,
      r: initialRadius * 2,
      fill: `url(#${this.glowGradientId})`
    });

    glowCircle.style.filter = `blur(${initialRadius * 0.1}px)`;
    glowCircle.style.opacity = this.config.glowIntensity;

    svg.appendChild(glowCircle);
    this.elements.glowCircle = glowCircle;

    return svg;
  }

  /**
   * Create enhanced corona effect using a custom SVG structure
   * @param {SVGElement} svg - SVG element to append to
   * @param {number} width - Container width
   * @param {number} height - Container height
   * @param {number} baseRadius - Base radius for corona
   */
  createEnhancedCorona(svg, width, height, baseRadius) {
    // Clear any existing corona group
    if (this.elements.coronaGroup) {
      svg.removeChild(this.elements.coronaGroup);
    }

    // Create a group to hold the custom corona SVG
    const coronaGroup = this.createSvgElement("g", {
      class: "corona-group"
    });
    svg.appendChild(coronaGroup);
    this.elements.coronaGroup = coronaGroup;

    // Inject the custom SVG structure
    const customCoronaSvg = `
      <defs>
        <radialGradient id="customCoronaGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="40%" stop-color="#FFFFE0" stop-opacity="1"/>
          <stop offset="55%" stop-color="#FFFFFF" stop-opacity="0.9"/>
          <stop offset="70%" stop-color="#FFFFFF" stop-opacity="0.6"/>
          <stop offset="85%" stop-color="#FFFFFF" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="${width / 2}" cy="${height / 2}" r="${baseRadius}" fill="url(#customCoronaGlow)" style="filter: blur(${baseRadius * 0.015}px); mix-blend-mode: screen;"/>
    `;

    // Create a temporary container to parse the SVG string
    const tempContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    tempContainer.innerHTML = customCoronaSvg;

    // Append the parsed SVG elements to the corona group
    Array.from(tempContainer.children).forEach(child => {
      coronaGroup.appendChild(child);
    });
  }

  /**
   * Update the glow gradient
   * @param {SVGDefsElement} defs - SVG defs element
   */
  
  updateGlowGradient(defs) {
    // Remove existing gradient if it exists
    const existingGradient = defs.querySelector(`#${this.glowGradientId}`);
    if (existingGradient) {
      defs.removeChild(existingGradient);
    }

    // Get color values from config
    const colors = this.config.glowColors;

    // Create new gradient
    const gradient = this.createSvgElement("radialGradient", {
      id: this.glowGradientId,
      cx: "50%",
      cy: "50%",
      r: "50%"
    });

    // Define gradient stops based on selected color
    const stops = [
      { offset: "0%", color: colors.inner },
      { offset: "30%", color: colors.middle },
      { offset: "60%", color: colors.outer },
      { offset: "100%", color: colors.fade }
    ];

    stops.forEach(stop => {
      const stopElement = this.createSvgElement("stop", {
        offset: stop.offset,
        "stop-color": stop.color
      });
      gradient.appendChild(stopElement);
    });

    defs.appendChild(gradient);
  }
  

  /**
   * Update star positions based on map movement
   * @param {number} bearingDelta - Change in map bearing
   * @param {number} pitchDelta - Change in map pitch
   * @param {number} lngDelta - Change in map longitude
   */
  updateStarPositions(bearingDelta, pitchDelta, lngDelta) {
    if (!this.elements.starfieldSvg || !this.stars.length) return;

    const width = parseInt(this.elements.starfieldSvg.getAttribute("width"));
    const height = parseInt(this.elements.starfieldSvg.getAttribute("height"));

    // Movement factors - adjust these to control how much stars move
    const bearingFactor = 0.5; // How much bearing affects horizontal movement
    const pitchFactor = 0.5; // How much pitch affects vertical movement
    const lngFactor = 2.0; // How much longitude change affects horizontal movement

    // Update each star's position
    this.stars.forEach(star => {
      if (!star.element) return;

      // Calculate new position based on map movement
      // Using modulo to wrap around screen edges
      let newX = (star.pos.x + bearingDelta * bearingFactor + lngDelta * lngFactor) % width;
      let newY = (star.pos.y + pitchDelta * pitchFactor) % height;

      // Handle negative values by wrapping to the other side
      if (newX < 0) newX += width;
      if (newY < 0) newY += height;

      // Update star data
      star.pos.x = newX;
      star.pos.y = newY;

      // Update visual position
      star.element.setAttribute("cx", newX);
      star.element.setAttribute("cy", newY);
    });
  }

  /**
   * Calculate the globe radius in pixels
   * @param {number} worldSize - Map world size
   * @param {number} latitudeDegrees - Current latitude
   * @returns {number} - The globe radius in pixels
   */
  getGlobeRadiusPixels(worldSize, latitudeDegrees) {
    // Scale globe based on latitude to maintain consistent zoom levels
    return worldSize / (2.0 * Math.PI) / Math.cos(latitudeDegrees * Math.PI / 180);
  }

  /**
   * Calculate the appropriate radius for the glow based on zoom level
   * @param {Object} map - MapLibre map instance
   * @returns {number} - The calculated radius
   */
  calculateGlowRadius(map) {
    if (!map) return 200; // Default fallback value

    const transform = map._getTransformForUpdate();
    if (!transform) return 200; // Another fallback if transform is not available

    const radius = this.getGlobeRadiusPixels(transform.worldSize, transform.center.lat);
    return Math.ceil(radius);
  }

  /**
   * Update the glow and corona effects based on map state
   * @param {Object} map - MapLibre map instance
   */
  updateGlobeGlow(map) {
    if (!map) return;

    const width = this.containers.glow.clientWidth;
    const height = this.containers.glow.clientHeight;

    // Calculate base globe radius
    const baseRadius = this.calculateGlowRadius(map);

    // Update glow position and size
    if (this.elements.glowCircle) {
      this.elements.glowCircle.setAttribute("cx", width / 2);
      this.elements.glowCircle.setAttribute("cy", height / 2);
      this.elements.glowCircle.setAttribute("r", baseRadius * 2); // Larger radius for the overall glow
      this.elements.glowCircle.style.filter = `blur(${baseRadius * 0.1}px)`;
      this.elements.glowCircle.style.opacity = this.config.glowIntensity;
    }

    // Update corona size dynamically
    if (this.elements.coronaGroup) {
      const coronaRadius = baseRadius * 1.01; // Slightly larger than the globe
      this.createEnhancedCorona(this.elements.glowSvg, width, height, coronaRadius);
    }
  }

  /**
   * Handle window resize events
   * @param {Object} map - MapLibre map instance
   */
  handleResize(map) {
    if (!map) return;

    // Recreate visual elements
    this.createStarfield();
    this.createGlobeGlow();

    // Update the glow based on current map state
    this.updateGlobeGlow(map);
  }

  /**
   * Attach the starry background to a MapLibre map
   * @param {Object} map - MapLibre map instance
   * @param {string} starfieldContainerId - DOM ID for starfield container
   * @param {string} glowContainerId - DOM ID for glow container
   */
  attachToMap(map, starfieldContainerId, glowContainerId) {
    if (!map) {
      console.error("MapLibre map instance is required");
      return;
    }

    this.mapInstance = map;

    // Setup containers
    if (!this.setupContainers(starfieldContainerId, glowContainerId)) {
      return;
    }

    // Make sure the map canvas has a transparent background
    const canvas = map.getCanvas();
    if (canvas) {
      canvas.style.background = "transparent";
    }

    // Create starfield and glow
    this.createStarfield();
    this.createGlobeGlow();

    // Store initial values for comparison
    this.lastCenter = map.getCenter();
    this.lastBearing = map.getBearing();
    this.lastPitch = map.getPitch();

    // Set up move event listener
    map.on("move", () => {
      const currentBearing = map.getBearing();
      const currentPitch = map.getPitch();
      const currentCenter = map.getCenter();

      // Calculate movement deltas
      const bearingDelta = currentBearing - this.lastBearing;
      const pitchDelta = currentPitch - this.lastPitch;
      const lngDelta = currentCenter.lng - this.lastCenter.lng;

      // Update star positions
      this.updateStarPositions(bearingDelta, pitchDelta, lngDelta);

      // Update glow
      this.updateGlobeGlow(map);

      // Save current values for next comparison
      this.lastBearing = currentBearing;
      this.lastPitch = currentPitch;
      this.lastCenter = currentCenter;
    });

    // Handle zoom events
    map.on("zoom", () => {
      this.updateGlobeGlow(map);
    });

    // Handle idle events
    map.on("idle", () => {
      this.updateGlobeGlow(map);
    });

    // Handle window resize
    window.addEventListener("resize", () => {
      this.handleResize(map);
    });

    // Update glow when style is loaded
    map.on("style.load", () => {
      setTimeout(() => {
        this.updateGlobeGlow(map);
      }, 100);
    });

    // Update everything after a short delay to ensure proper positioning
    setTimeout(() => {
      this.updateGlobeGlow(map);
    }, 200);
  }

  /**
   * Update configuration options
   * @param {Object} options - New configuration options
   */
  updateConfig(options = {}) {
    // Update config with new options
    if (options.glowIntensity !== undefined) {
      this.config.glowIntensity = options.glowIntensity;
    }
  }

}