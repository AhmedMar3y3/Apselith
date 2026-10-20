import {
  Cartesian2,
  Cartesian3,
  Color,
  LabelCollection,
  PointPrimitiveCollection,
  type Label,
  type PointPrimitive,
  type Scene,
} from 'cesium';
import {
  projectSkyMarker,
  skyPlanetPositions,
} from '../../domain/astronomy/ephemeris';
export class PlanetLayer {
  private bodies: ReturnType<typeof skyPlanetPositions> = [];
  private points: PointPrimitiveCollection;
  private labels: LabelCollection;
  private markers = new Map<string, { point: PointPrimitive; label: Label }>();
  constructor(scene: Scene) {
    this.points = scene.primitives.add(new PointPrimitiveCollection());
    this.labels = scene.primitives.add(new LabelCollection());
  }
  update(time: number, show: boolean) {
    this.points.show = show;
    this.labels.show = show;
    if (!show) return;
    this.bodies = skyPlanetPositions(time);
    for (const body of this.bodies) {
      let marker = this.markers.get(body.body);
      const position = new Cartesian3(body.x, body.y, body.z);
      if (!marker) {
        marker = {
          point: this.points.add({
            position,
            pixelSize: 4,
            color: Color.fromCssColorString(body.color),
          }),
          label: this.labels.add({
            position,
            text: body.body,
            font: '11px sans-serif',
            fillColor: Color.fromCssColorString(body.color),
            pixelOffset: new Cartesian2(0, -14),
          }),
        };
        this.markers.set(body.body, marker);
      }
      marker.point.position = position;
      marker.label.position = position;
    }
  }
  project(observer: Cartesian3) {
    if (!this.points.show) return;
    for (const body of this.bodies) {
      const marker = this.markers.get(body.body);
      if (!marker) continue;
      const projected = projectSkyMarker(body, observer);
      const position = new Cartesian3(projected.x, projected.y, projected.z);
      marker.point.position = position;
      marker.label.position = position;
    }
  }
}
