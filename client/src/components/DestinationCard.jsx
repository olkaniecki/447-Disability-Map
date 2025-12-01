import React from "react";
import styled from "styled-components";
import { useBuildingMetadata } from "../utils/loadMetadata";
import { MapPinIcon } from "@heroicons/react/24/solid";

const basePath = process.env.PUBLIC_URL || "";


const Card = styled.div`
    position: relative;
    width: 400px;
    height: 280px;
    background-color: ${props => props.theme.cardBg};
    color: ${props => props.theme.cardText};
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border: 2px solid;
    border-color: ${props => props.theme.cardBorder};
`;

const ImageWrapper = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 50%;
    overflow: hidden;
`;

const TextWrapper = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 50%;
    padding: 10px;
    display: flex;
    flex-direction: column;
`;

const BuildingImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;           /* required */
    object-position: center 40%; /* horizontal vertical - try 40% to show more center */
    display: block;
`;

const Label = styled.span`
    position: absolute;
    top: 120px; /* slightly overlapping image edge */
    left: 6px;
    background-color: ${props => props.theme.labelBg};
    padding: 6px 12px;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 20px;
    white-space: nowrap;
    backdrop-filter: blur(4px);
`;

const Acronym = styled.p`
    background-color: ${props => props.theme.acronymBg};
    color: ${props => props.theme.acronymText};
    border-radius: 0.5rem;
    border: none;
    padding: 5px 9px;
    font-weight: 600;
    width: fit-content;
`;
const FloorplanButton = styled.button`
    left: 10px;
    background-color: ${props => props.theme.buttonBg};
    color: ${props => props.theme.buttonText};
    border-radius: 1rem;
    border: 1px solid transparent;
    cursor: pointer;
    padding: 0px 8px;        /* controls height/width */
    width: fit-content;        /* button only as wide as its content */

    &:hover {
        background-color:  ${props => props.theme.buttonHoverBg};
        color: ${props => props.theme.buttonHoverText};
        border-color: ${props => props.theme.buttonHover};
    }
`;

export default function DestinationCard({ label, building, onClear, onShowFloorplan}) {
    const metadata = useBuildingMetadata();
    if (!building) return null; // or return a placeholder/loading message

    const id = building.properties.building_id;
    const info = metadata[id] || {};
    const imageSrc = `${basePath}/assets/${id}.jpg`;


    return(
        <Card>
            <ImageWrapper>
                <BuildingImage src={imageSrc} alt={building?.properties?.name || "Building"}
                    onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = `${basePath}/assets/default.jpg`;

                    }}
                />
            </ImageWrapper>
            <Label>{building.properties.name}</Label> 
            <TextWrapper>
                <Acronym>{metadata[id]?.acronym}</Acronym>
                <FloorplanButton type="button" onClick={() => onShowFloorplan(building)}>
                    <p style={{fontSize: "15px"}}>View Floorplan</p>
                </FloorplanButton>
            </TextWrapper>
            
        </Card>
    );
}