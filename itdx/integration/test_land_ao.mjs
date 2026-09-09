import test from "node:test"
import assert from "node:assert/strict"
import { AO_ORIGIN_LAT, AO_ORIGIN_LNG, AO_PLACE, BOUNDS, snapshot, toLngLat } from "../../lib/itdx/replay-core.mjs"

function walkCoords(geometry, visit) {
  if (!geometry) return
  if (geometry.type === "Point") visit(geometry.coordinates)
  else if (geometry.type === "LineString") geometry.coordinates.forEach(visit)
  else if (geometry.type === "Polygon") geometry.coordinates.flat().forEach(visit)
}

test("replay AO is Fort Stewart land, not 0,0 ocean", () => {
  assert.match(AO_PLACE, /Fort Stewart/)
  assert.ok(AO_ORIGIN_LAT > 31.7 && AO_ORIGIN_LAT < 32.1)
  assert.ok(AO_ORIGIN_LNG > -82 && AO_ORIGIN_LNG < -81)
  const origin = toLngLat(0, 0)
  assert.ok(Math.abs(origin[0] - AO_ORIGIN_LNG) < 1e-9)
  assert.ok(Math.abs(origin[1] - AO_ORIGIN_LAT) < 1e-9)
  assert.ok(BOUNDS[0][0] < -81.2 && BOUNDS[1][0] < -81.2)
  assert.ok(BOUNDS[0][1] > 31.6 && BOUNDS[1][1] > 31.6)
  for (const index of [0, 40, 80, 120]) {
    const frame = snapshot(index)
    assert.equal(frame.data_origin, "SYNTHETIC_EXERCISE")
    assert.match(frame.model.boundary, /Fort Stewart/)
    assert.equal(frame.model.ao_place, AO_PLACE)
    for (const feature of frame.geojson.features) {
      walkCoords(feature.geometry, ([lng, lat]) => {
        assert.ok(lng < -81.2 && lng > -82.1, `ocean/wrong lon ${lng}`)
        assert.ok(lat > 31.6 && lat < 32.2, `ocean/wrong lat ${lat}`)
      })
    }
    for (const asset of frame.assets) {
      if (!asset.position) continue
      assert.ok(asset.position[0] < -81.2 && asset.position[1] > 31.6)
    }
  }
})
