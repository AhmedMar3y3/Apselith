import { useEffect, useRef, useState } from 'react';
import {
  Viewer,
  Cartesian2,
  Cartesian3,
  Color,
  PolylineCollection,
  EllipsoidTerrainProvider,
  TileMapServiceImageryProvider,
  SingleTileImageryProvider,
  buildModuleUrl,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  JulianDate,
  GridImageryProvider,
  HeadingPitchRange,
  BoundingSphere,
  Matrix4,
  Material,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import type { SatellitePosition } from '../../infrastructure/propagation/sgp4';
import type { SatelliteTrack } from '../../infrastructure/propagation/interpolation';
import { SatelliteLayer } from './satellite-layer';
import { useClock } from '../timeline/clock-store';
import { clockTime } from '../../domain/clock';
import { PlanetLayer } from './planet-layer';
import { FollowCamera } from './follow-camera';
type Props = {
  positions: SatellitePosition[];
  tracks: SatelliteTrack[];
  selectedName: string;
  trajectory: SatellitePosition[];
  selectedId: number;
  onSelect: (id: number) => void;
  time: number;
  groundTrack: boolean;
  labels: boolean;
  grid: boolean;
  lighting: boolean;
  expanded: boolean;
  sky: boolean;
  camera: { mode: 'overview' | 'focus' | 'follow' | 'polar'; nonce: number };
};
const fixedCartesian = (position: SatellitePosition) =>
  new Cartesian3(position.x * 1000, position.y * 1000, position.z * 1000);
export function Globe(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const satellites = useRef<SatelliteLayer | null>(null);
  const planets = useRef<PlanetLayer | null>(null);
  const paths = useRef<PolylineCollection | null>(null);
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  }, [props]);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [tilesReady, setTilesReady] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('overview');
  const [skyError, setSkyError] = useState('');
  const cameraTransition = useRef({
    nonce: -1,
    started: false,
    following: false,
  });
  useEffect(() => {
    if (!container.current) return;
    let instance: Viewer | undefined;
    let cancelled = false;
    let handler: ScreenSpaceEventHandler | undefined;
    let removeTileListener: (() => void) | undefined;
    let removeErrorListener: (() => void) | undefined;
    async function initialize() {
      try {
        const imagery = await SingleTileImageryProvider.fromUrl(
          '/assets/earth-blue-marble.jpg',
          {
            credit:
              'NASA Earth Observatory · Blue Marble (July 2004 composite)',
          },
        ).catch((failure: unknown) => {
          console.warn(
            'Detailed Earth imagery unavailable; loading bundled Natural Earth fallback.',
            failure,
          );
          return TileMapServiceImageryProvider.fromUrl(
            buildModuleUrl('Assets/Textures/NaturalEarthII'),
          );
        });
        if (cancelled || !container.current) return;
        instance = new Viewer(container.current, {
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          baseLayer: false,
          terrainProvider: new EllipsoidTerrainProvider(),
          shouldAnimate: false,
          requestRenderMode: true,
          maximumRenderTimeChange: Infinity,
        });
        instance.imageryLayers.addImageryProvider(imagery);
        instance.scene.backgroundColor = Color.BLACK;
        instance.scene.sunBloom = false;
        instance.scene.highDynamicRange = false;
        instance.scene.postProcessStages.fxaa.enabled = false;
        if (instance.scene.skyBox)
          instance.scene.skyBox.show = latest.current.sky;
        if (instance.scene.sun) instance.scene.sun.show = latest.current.sky;
        if (instance.scene.moon) instance.scene.moon.show = latest.current.sky;
        instance.scene.globe.enableLighting = latest.current.lighting;
        instance.scene.globe.showGroundAtmosphere = true;
        instance.resolutionScale = Math.min(window.devicePixelRatio, 1.5);
        instance.targetFrameRate = 30;
        const gl = instance.scene.canvas.getContext('webgl2');
        const rendererInfo = gl?.getExtension('WEBGL_debug_renderer_info');
        const rendererName: unknown = rendererInfo
          ? gl?.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL)
          : undefined;
        if (
          typeof rendererName === 'string' &&
          /swiftshader|llvmpipe|software|microsoft basic/i.test(rendererName)
        ) {
          // Software rasterizers can stall the whole interface at full display density.
          instance.resolutionScale = 0.65;
          instance.targetFrameRate = 12;
        }
        instance.camera.setView({
          destination: Cartesian3.fromDegrees(25, 15, 10500000),
          orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
        });
        removeTileListener =
          instance.scene.globe.tileLoadProgressEvent.addEventListener(
            (remaining: number) => {
              if (!cancelled && remaining === 0) setTilesReady(true);
            },
          );
        removeErrorListener = instance.scene.renderError.addEventListener(
          (_scene, failure: unknown) => {
            if (!cancelled)
              setError(
                failure instanceof Error
                  ? failure.message
                  : 'The renderer encountered a WebGL error.',
              );
          },
        );
        viewer.current = instance;
        satellites.current = new SatelliteLayer(instance.scene);
        planets.current = new PlanetLayer(instance.scene);
        paths.current = instance.scene.primitives.add(new PolylineCollection());
        handler = new ScreenSpaceEventHandler(instance.scene.canvas);
        handler.setInputAction((event: { position: Cartesian2 }) => {
          const picked: unknown = instance?.scene.pick(event.position);
          if (
            typeof picked === 'object' &&
            picked !== null &&
            'id' in picked &&
            typeof picked.id === 'number'
          )
            latest.current.onSelect(picked.id);
        }, ScreenSpaceEventType.LEFT_CLICK);
        setReady(true);
      } catch (failure) {
        if (!cancelled)
          setError(
            failure instanceof Error
              ? failure.message
              : 'WebGL initialization failed.',
          );
      }
    }
    void initialize();
    return () => {
      cancelled = true;
      handler?.destroy();
      removeTileListener?.();
      removeErrorListener?.();
      if (instance && !instance.isDestroyed()) instance.destroy();
      viewer.current = null;
      satellites.current = null;
      planets.current = null;
    };
  }, []);
  useEffect(() => {
    const instance = viewer.current;
    if (!ready || !instance) return;
    let frame = 0;
    let lastFrame = -Infinity;
    let lastTime = NaN;
    let lastProps: Props | undefined;
    let lastSkyMinute = NaN;
    let lastSkyVisible: boolean | undefined;
    const followCamera = new FollowCamera();
    const frameInterval =
      1000 /
      (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 4 : 30);
    const render = (monotonic: number) => {
      frame = requestAnimationFrame(render);
      if (document.hidden || monotonic - lastFrame < frameInterval) return;
      const current = latest.current;
      const time = clockTime(useClock.getState(), monotonic);
      if (time === lastTime && current === lastProps) return;
      lastFrame = monotonic;
      lastTime = time;
      lastProps = current;
      const selected = satellites.current?.update(
        current.tracks,
        time,
        current.selectedId,
        current.selectedName,
        current.labels,
      );
      instance.clock.currentTime = JulianDate.fromDate(new Date(time));
      instance.scene.globe.enableLighting = current.lighting;
      if (instance.scene.skyBox) instance.scene.skyBox.show = current.sky;
      if (instance.scene.sun) instance.scene.sun.show = current.sky;
      if (instance.scene.moon) instance.scene.moon.show = current.sky;
      const skyMinute = Math.floor(time / 60000);
      if (skyMinute !== lastSkyMinute || current.sky !== lastSkyVisible) {
        lastSkyMinute = skyMinute;
        lastSkyVisible = current.sky;
        try {
          planets.current?.update(skyMinute * 60000, current.sky);
          setSkyError('');
        } catch (failure) {
          planets.current?.update(time, false);
          setSkyError(
            failure instanceof Error
              ? failure.message
              : 'Planet positions unavailable.',
          );
        }
      }
      const transition = cameraTransition.current;
      const duration = window.matchMedia('(prefers-reduced-motion: reduce)')
        .matches
        ? 0
        : 1.1;
      if (
        !transition.started &&
        (selected ||
          current.camera.mode === 'overview' ||
          current.camera.mode === 'polar')
      ) {
        transition.started = true;
        if (
          (current.camera.mode === 'follow' ||
            current.camera.mode === 'focus') &&
          selected
        ) {
          setCameraStatus('centering');
          instance.camera.flyToBoundingSphere(new BoundingSphere(selected, 1), {
            offset: new HeadingPitchRange(0, -0.65, 3000000),
            duration,
            complete: () => {
              if (cameraTransition.current === transition) {
                // Enter the target frame once; subsequent updates preserve input.
                instance.camera.lookAt(
                  selected,
                  new HeadingPitchRange(0, -0.65, 3000000),
                );
                transition.following = true;
                setCameraStatus('following');
              }
            },
          });
        } else {
          setCameraStatus('overview');
          instance.camera.flyTo({
            destination: Cartesian3.fromDegrees(
              25,
              current.camera.mode === 'polar' ? 89 : 15,
              10500000,
            ),
            orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
            duration,
          });
        }
      }
      if (
        transition.following &&
        (current.camera.mode === 'follow' || current.camera.mode === 'focus') &&
        selected
      )
        followCamera.update(instance.camera, selected);
      planets.current?.project(instance.camera.positionWC);
      instance.scene.requestRender();
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [ready]);
  useEffect(() => {
    const collection = paths.current;
    if (!ready || !collection) return;
    collection.removeAll();
    if (props.trajectory.length < 2) return;
    collection.add({
      positions: props.trajectory.map(fixedCartesian),
      width: 2,
      material: Material.fromType('Color', {
        color: Color.fromCssColorString('#ffcc75'),
      }),
    });
    if (props.groundTrack)
      collection.add({
        positions: props.trajectory.map((position) =>
          Cartesian3.fromDegrees(position.longitude, position.latitude, 2000),
        ),
        width: 1,
      });
    viewer.current?.scene.requestRender();
  }, [ready, props.trajectory, props.groundTrack]);
  useEffect(() => {
    const instance = viewer.current;
    if (!ready || !instance) return;
    const layer = props.grid
      ? instance.imageryLayers.addImageryProvider(
          new GridImageryProvider({
            cells: 12,
            color: Color.CYAN.withAlpha(0.16),
            backgroundColor: Color.TRANSPARENT,
          }),
        )
      : undefined;
    return () => {
      if (layer && !instance.isDestroyed())
        instance.imageryLayers.remove(layer);
    };
  }, [ready, props.grid]);
  useEffect(() => {
    const instance = viewer.current;
    if (!ready || !instance) return;
    instance.camera.cancelFlight();
    instance.camera.lookAtTransform(Matrix4.IDENTITY);
    cameraTransition.current = {
      nonce: props.camera.nonce,
      started: false,
      following: false,
    };
  }, [ready, props.camera]);
  useEffect(() => {
    const instance = viewer.current;
    if (!ready || !instance) return;
    const frame = requestAnimationFrame(() => {
      instance.resize();
      instance.scene.requestRender();
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, props.expanded]);
  return (
    <div
      className="globe-stage"
      data-tiles-ready={tilesReady}
      data-camera-status={cameraStatus}
      data-camera-target={props.selectedId}
    >
      <div
        ref={container}
        className="cesium-host"
        aria-label="Interactive Earth globe; drag to rotate and scroll to zoom"
      />
      {error && (
        <div className="globe-fallback" role="status">
          <h2>3D view unavailable</h2>
          <p>{error}</p>
          <p>
            Enable WebGL or try another browser. Predicted positions remain
            available in the details panel.
          </p>
        </div>
      )}
      {!ready && !error && (
        <div className="globe-loading">Initializing Earth renderer…</div>
      )}
      {skyError && (
        <p className="sky-warning" role="status">
          {skyError}
        </p>
      )}
      <div className="globe-caption">
        <span className="crosshair">+</span>
        <span>
          EARTH / WGS 84
          <br />
          <small>
            {cameraStatus === 'following'
              ? 'Following selected satellite'
              : cameraStatus === 'centering'
                ? 'Centering selected satellite…'
                : props.camera.mode === 'follow' ||
                    props.camera.mode === 'focus'
                  ? 'Waiting to center selected satellite…'
                  : 'SGP4 predicted positions · drag to explore'}
          </small>
        </span>
      </div>
    </div>
  );
}
