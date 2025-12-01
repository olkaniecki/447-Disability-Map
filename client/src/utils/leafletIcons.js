// src/utils/leafletIcons.js
import L from "leaflet";

export const blankIcon = L.divIcon({
  html: "",           // no content
  className: "leaflet-blank-icon",
  iconSize: [0, 0],
});
