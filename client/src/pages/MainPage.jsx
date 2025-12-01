import React, { useState, useEffect } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import MapView from "../components/MapView";
import RoutePlanner from "../components/RoutePlanner";
import FloorplanViewer from "../components/FloorplanViewer";
import styled, { createGlobalStyle } from "styled-components";
import React, { useState } from "react";

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
  }

  html, body, #root {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100vh;
    background-color: #acaaaa;
    overflow: hidden;
  }
`;

const PageContainer = styled.div`
  display: flex;
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: ${(props) => props.theme.routePlannerBg};
`;

const SideBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 440px;
  height: 100%;
  background-color: ${(props) => props.theme.routePlannerBg};
  color: white;
  padding: 1rem;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const MapWrapper = styled.div`
  flex: 1;
  position: relative;
  background-color: #d9d9d9;
`;

const FloorplanOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: white;
  z-index: 500;
  overflow: hidden;

  /* Smooth fade-in */
  animation: fadeIn 0.2s ease;
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
`;

export default function MainPage({ darkMode }) {
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [featureToAdd, setFeatureToAdd] = useState(null);
  const [routeRequest, setRouteRequest] = useState(null);

  // Temporary full-screen announcement
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  // Floorplan overlay controller
  const [activeBuilding, setActiveBuilding] = useState(null);

  const handleAddFeature = (feature) => {
    setFeatureToAdd(feature);
    setSelectedFeature(feature);
  };

  const handleFeatureConsumed = () => setFeatureToAdd(null);

  const handleRouteRequest = (startId, endId) => {
    setRouteRequest({ startId, endId });
  };

  return (
    <>
      <GlobalStyle />
      <PageContainer>

        {/* LEFT SIDEBAR */}
        <SideBar>
          <RoutePlanner
            onSelectFeature={setSelectedFeature}
            addFeature={featureToAdd}
            onFeatureConsumed={handleFeatureConsumed}
            onRouteRequest={handleRouteRequest}
            onShowFloorplan={(building) => setActiveBuilding(building)}
          />
        </SideBar>

        {/* RIGHT MAP + OVERLAY */}
        <MapWrapper>

          {/* MAP ALWAYS MOUNTS, NEVER RELOADS */}
          <MapView
            selectedFeature={selectedFeature}
            onAddFeature={handleAddFeature}
            darkMode={darkMode}
            routeRequest={routeRequest}
            onShowFloorplan={(building) => setActiveBuilding(building)}
          />

          {/* FLOORPLAN OVERLAY */}
          {activeBuilding && (
            <FloorplanOverlay>
              <FloorplanViewer
                building={activeBuilding}
                onBack={() => setActiveBuilding(null)}
              />
            </FloorplanOverlay>
          )}
        </MapWrapper>

        {/* ANNOUNCEMENT MODAL */}
        {showAnnouncement && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
          >
            <div
              style={{
                width: "560px",
                maxWidth: "90vw",
                padding: "24px",
                borderRadius: "14px",
                background: "#ffffff",
                color: "#000",
                boxShadow: "0 6px 14px rgba(0,0,0,0.25)",
              }}
            >
              <h2 style={{ marginTop: 0 }}>Announcements</h2>

              <div>
                <h3>🚧 Alerts</h3>
                <p>
                  Construction around <strong>Sherman</strong> and{" "}
                  <strong>Sondheim</strong>, so some routes may shift.
                </p>

                <h3>♿ Accessibility Notes</h3>
                <p>Outdoor accessible routes are open during school hours.</p>
                <p>Indoor 24/7 routes need clearance once buildings lock.</p>

                <h3>⚠️ Quick Reminder</h3>
                <p>This app doesn’t replace official emergency instructions.</p>
              </div>

              <button
                onClick={() => setShowAnnouncement(false)}
                style={{
                  marginTop: "20px",
                  padding: "12px",
                  width: "100%",
                  borderRadius: "10px",
                  border: "none",
                  background: "#333",
                  color: "white",
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </PageContainer>
    </>
  );
}
