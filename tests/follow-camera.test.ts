import { expect, it } from 'vitest';
import {
  Camera,
  Cartesian3,
  GeographicProjection,
  HeadingPitchRange,
  Matrix4,
  type Scene,
} from 'cesium';
import { FollowCamera } from '../src/features/globe/follow-camera';

it('preserves zoom and rotation while the tracked target moves', () => {
  // Camera math needs projection/dimensions, not a WebGL renderer.
  const scene = {
    drawingBufferWidth: 1280,
    drawingBufferHeight: 720,
    mapProjection: new GeographicProjection(),
  } as Scene;
  const camera = new Camera(scene);
  const follow = new FollowCamera();
  const target = Cartesian3.fromDegrees(25, 30, 420000);
  camera.lookAt(target, new HeadingPitchRange(0, -0.65, 3000000));
  camera.zoomIn(700000);
  camera.rotateRight(0.3);
  camera.rotateUp(0.15);
  const pose = [camera.position, camera.direction, camera.up, camera.right].map(
    (vector) => Cartesian3.clone(vector),
  );
  const worldBefore = Cartesian3.clone(camera.positionWC);
  for (let index = 1; index <= 60; index++) {
    const movingTarget = Cartesian3.fromDegrees(25 + index * 0.01, 30, 420000);
    follow.update(camera, movingTarget);
    for (const [part, vector] of [
      camera.position,
      camera.direction,
      camera.up,
      camera.right,
    ].entries()) {
      const expected = pose[part];
      if (!expected) throw new Error('Missing camera pose component');
      expect(Cartesian3.distance(vector, expected)).toBeLessThan(1e-8);
    }
    expect(
      Cartesian3.distance(
        Matrix4.getTranslation(camera.transform, new Cartesian3()),
        movingTarget,
      ),
    ).toBeLessThan(1e-8);
  }
  expect(Cartesian3.distance(camera.positionWC, worldBefore)).toBeGreaterThan(
    1000,
  );
  expect(Cartesian3.magnitude(camera.position)).toBeCloseTo(2300000, 5);
});
