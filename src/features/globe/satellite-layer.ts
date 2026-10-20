import {
  BillboardCollection,
  Cartesian2,
  Cartesian3,
  Color,
  LabelCollection,
  type Billboard,
  type Label,
  type Scene,
} from 'cesium';
import {
  interpolateTrack,
  type SatelliteTrack,
} from '../../infrastructure/propagation/interpolation';
/** Screen-sized schematic glyphs, never physical spacecraft dimensions or attitude. */
export class SatelliteLayer {
  private billboards: BillboardCollection;
  private labels: LabelCollection;
  private markers = new Map<number, Billboard>();
  private label: Label;
  constructor(scene: Scene) {
    this.billboards = scene.primitives.add(new BillboardCollection());
    this.labels = scene.primitives.add(new LabelCollection());
    this.label = this.labels.add({
      position: Cartesian3.ZERO,
      text: '',
      font: '12px sans-serif',
      fillColor: Color.fromCssColorString('#f1c57d'),
      showBackground: true,
      backgroundColor: Color.BLACK.withAlpha(0.75),
      pixelOffset: new Cartesian2(0, 30),
      show: false,
    });
  }
  update(
    tracks: SatelliteTrack[],
    time: number,
    selectedId: number,
    selectedName: string,
    showLabel: boolean,
  ) {
    const active = new Set(tracks.map((track) => track.id));
    for (const [id, marker] of this.markers)
      if (!active.has(id)) {
        this.billboards.remove(marker);
        this.markers.delete(id);
      }
    this.label.show = false;
    const selectedTrack = tracks.find((track) => track.id === selectedId);
    const selectedPoint = selectedTrack
      ? interpolateTrack(selectedTrack, time)
      : undefined;
    let selectedPosition: Cartesian3 | undefined;
    for (const track of tracks) {
      let marker = this.markers.get(track.id);
      const selected = track.id === selectedId;
      if (!marker) {
        marker = this.billboards.add({
          position: Cartesian3.ZERO,
          id: track.id,
          image:
            track.id === 25544
              ? '/brand/station-marker.svg'
              : '/brand/satellite-marker.svg',
        });
        this.markers.set(track.id, marker);
      }
      const point = interpolateTrack(track, time);
      marker.show = Boolean(point);
      if (!point) continue;
      // Attached station modules can publish the same orbit. Keep the selected glyph legible
      // without inventing screen offsets or moving any catalog position.
      if (
        !selected &&
        selectedPoint &&
        Math.hypot(
          point.x - selectedPoint.x,
          point.y - selectedPoint.y,
          point.z - selectedPoint.z,
        ) < 0.1
      ) {
        marker.show = false;
        continue;
      }
      const position = new Cartesian3(
        point.x * 1000,
        point.y * 1000,
        point.z * 1000,
      );
      marker.position = position;
      marker.width = selected ? 38 : 21;
      marker.height = selected ? 38 : 21;
      marker.color =
        selected && track.id !== 25544
          ? Color.fromCssColorString('#f1c57d')
          : Color.WHITE;
      if (selected) {
        selectedPosition = position;
        this.label.position = position;
        this.label.text = `${selectedName} · ${selectedId}`;
        this.label.show = showLabel;
      }
    }
    return selectedPosition;
  }
}
