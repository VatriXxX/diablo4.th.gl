"use client";
import { useOverwolfRouter } from "@/app/(overwolf)/components/overwolf-router";
import { NODE, nodes } from "@/app/lib/nodes";
import { useDiscoveredNodesStore } from "@/app/lib/storage/discovered-nodes";
import { useGlobalSettingsStore } from "@/app/lib/storage/global-settings";
import leaflet from "leaflet";
import { useParams, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo } from "react";
import { useDict } from "../(i18n)/i18n-provider";
import useFilters from "../use-filters";
import { useMap } from "./map";
import Marker from "./marker";

export default function Nodes() {
  const map = useMap();
  const featureGroup = useMemo(() => {
    const featureGroup = new leaflet.FeatureGroup();
    featureGroup.addTo(map);
    return featureGroup;
  }, []);

  const router = useOverwolfRouter();
  const params = useParams()!;
  const searchParams = useSearchParams()!;
  const { discoveredNodes, toggleDiscoveredNode } = useDiscoveredNodesStore();
  const isOverwolf = "value" in router;
  const search = useMemo(() => {
    return (
      (isOverwolf ? router.value.search : searchParams.get("search")) ?? ""
    ).toLowerCase();
  }, [searchParams, isOverwolf && router.value.search]);
  const isScreenshot = searchParams.get("screenshot") === "true";
  const dict = useDict();
  const iconSize = useGlobalSettingsStore((state) => state.iconSize);
  const isAlternativeDiscoveredStyle = useGlobalSettingsStore(
    (state) => state.isAlternativeDiscoveredStyle
  );

  const paramsName = isOverwolf ? router.value.name : params.name;
  const paramsCoordinates = isOverwolf
    ? router.value.coordinates
    : params.coordinates;
  const [filters] = useFilters();

  const selectedName = useMemo(
    () => paramsName && decodeURIComponent(paramsName as string),
    [paramsName]
  );
  const coordinates = useMemo(
    () =>
      (paramsCoordinates && decodeURIComponent(paramsCoordinates as string))
        ?.replace("@", "")
        .split(",")
        .map(Number) ?? [],
    [paramsCoordinates]
  );

  useEffect(() => {
    if (!search) {
      return;
    }
    const bounds = featureGroup.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        duration: 1,
        maxZoom: 5,
        padding: [25, 25],
      });
    }
  }, [search]);

  const onMarkerClick = useCallback((node: NODE) => {
    if (location.pathname.startsWith("/embed")) {
      return;
    }
    const name =
      dict.generated[node.type]?.["termId" in node ? node.termId : node.id]
        ?.name ?? "";
    if ("update" in router) {
      router.update({
        name: encodeURIComponent(name || node.type),
        coordinates: `@${node.x},${node.y}`,
      });
    } else {
      router.push(
        `${params.lang ?? ""}/nodes/${encodeURIComponent(name || node.type)}/@${
          node.x
        },${node.y}${location.search}`
      );
    }
  }, []);

  return (
    <>
      {nodes.map((node) => {
        let isHighlighted = false;
        if (selectedName && coordinates) {
          const name =
            dict.generated[node.type]?.[
              "termId" in node ? node.termId : node.id
            ]?.name ?? "";
          if (
            node.x === coordinates[0] &&
            node.y === coordinates[1] &&
            (name || node.type) === selectedName
          ) {
            isHighlighted = true;
          } else if (isScreenshot) {
            return <Fragment key={node.id} />;
          }
        }

        let isTrivial = false;
        if (!filters.includes(node.type) && !isHighlighted) {
          isTrivial = true;
        } else if (search && !isHighlighted) {
          const name =
            dict.generated[node.type]?.[
              "termId" in node ? node.termId : node.id
            ]?.name ?? "";

          isTrivial = !(
            name.toLowerCase().includes(search) ||
            dict.nodes[node.type].toLowerCase().includes(search) ||
            ("attribute" in node &&
              node.attribute?.toLowerCase().includes(search)) ||
            ("aspectId" in node &&
              dict.generated.aspects[node.aspectId]?.name
                .toLowerCase()
                .includes(search)) ||
            ("className" in node &&
              node.className.toLowerCase().includes(search))
          );
        }

        if (isTrivial) {
          return <Fragment key={node.id} />;
        }
        return (
          <Marker
            key={node.id}
            id={node.id}
            node={node}
            type={node.type}
            isHighlighted={isHighlighted}
            isDiscovered={discoveredNodes.includes(node.id)}
            iconSize={iconSize}
            isAlternativeDiscoveredStyle={
              node.type === "waypoints" && isAlternativeDiscoveredStyle
            }
            onClick={onMarkerClick}
            onContextMenu={toggleDiscoveredNode}
            featureGroup={featureGroup}
          />
        );
      })}
    </>
  );
}
