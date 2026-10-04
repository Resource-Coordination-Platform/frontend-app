export type MapCoordinate = { latitude: number; longitude: number };
export type SafeZone = { id: string; name: string; lat: number; lng: number; type: string };
export type DivisionBoundary = { type: 'Polygon'; coordinates: number[][][] } | { type: 'MultiPolygon'; coordinates: number[][][][] };
export type MapCommand =
  | { type: 'division'; boundary: DivisionBoundary; readOnly?: boolean }
  | { type: 'draft'; location: MapCoordinate | null }
  | { type: 'update'; zones: SafeZone[]; location: MapCoordinate | null }
  | { type: 'fit'; points: MapCoordinate[] }
  | { type: 'locate'; location: MapCoordinate };
export type MapEvent = { type: 'ready' | 'division-ready' | 'clear' | 'error' | 'tiles-ok' | 'outside' } | { type: 'select'; id: string } | { type: 'pick'; location: MapCoordinate };
export type SafeMapHandle = { send: (command: MapCommand) => void };
export type SafeMapProps = { onEvent: (event: MapEvent) => void };

// Only static HTML goes into the document. API values cross the bridge as JSON,
// and marker names are assigned with textContent, never interpreted as HTML.
export const safeMapDocument = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;width:100%;margin:0;background:#e2e8f0}
#map{visibility:hidden}
.leaflet-bottom .leaflet-control{margin-bottom:2px}
.leaflet-control-attribution{font-size:10px}
</style></head><body><div id="map" aria-label="Safe zones map"></div>
<script>
function emit(event) {
  var message = JSON.stringify(event);
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(message);
  else window.parent.postMessage({source:'safe-map',event:event}, '*');
}
</script>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" onerror="emit({type:'error'})"></script>
<script>
if (window.L) {
  var map = L.map('map', {zoomControl:false}).setView([7.8731,80.7718],7);
  L.control.zoom({position:'bottomleft'}).addTo(map);
  var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom:19,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
  }).addTo(map);
  tiles.on('tileerror',function(){emit({type:'error'});});
  tiles.on('tileload',function(){emit({type:'tiles-ok'});});
  var markers = L.layerGroup().addTo(map);
  var userMarker = null;
  var division = null, divisionLayer = null, divisionMask = null, draft = null, readOnly = false;
  function ringContains(x,y,ring) {
    var inside = false;
    for (var i=0,j=ring.length-1;i<ring.length;j=i++) {
      var a=ring[j],b=ring[i];
      var cross=(x-a[0])*(b[1]-a[1])-(y-a[1])*(b[0]-a[0]);
      if (Math.abs(cross)<1e-12 && x>=Math.min(a[0],b[0]) && x<=Math.max(a[0],b[0]) && y>=Math.min(a[1],b[1]) && y<=Math.max(a[1],b[1])) return 2;
      if ((a[1]>y)!=(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
    }
    return inside ? 1 : 0;
  }
  function inDivision(lat,lng) {
    var polygons=division.type==='Polygon' ? [division.coordinates] : division.coordinates;
    return polygons.some(function(polygon){return polygon.length && ringContains(lng,lat,polygon[0]) && !polygon.slice(1).some(function(ring){return ringContains(lng,lat,ring)===1;});});
  }
  function valid(point) {
    return point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
      && Math.abs(point.latitude)<=90 && Math.abs(point.longitude)<=180;
  }
  window.safeMapReceive = function(command) {
    if (command.type === 'division') {
      division=command.boundary;
      readOnly=!!command.readOnly;
      if (divisionLayer) map.removeLayer(divisionLayer);
      if (divisionMask) map.removeLayer(divisionMask);
      divisionLayer=L.geoJSON(division,{interactive:false,style:{color:'#2563eb',weight:3,fillOpacity:0}}).addTo(map);
      var polygons=division.type==='Polygon' ? [division.coordinates] : division.coordinates;
      var rings=[[[90,-360],[90,360],[-90,360],[-90,-360]]];
      polygons.forEach(function(polygon){polygon.forEach(function(ring){rings.push(ring.map(function(p){return [p[1],p[0]];}));});});
      if (!map.getPane('division-mask')) {map.createPane('division-mask');map.getPane('division-mask').style.zIndex=450;}
      divisionMask=L.polygon(rings,{pane:'division-mask',stroke:false,fillColor:'#e2e8f0',fillOpacity:1,fillRule:'evenodd',interactive:false}).addTo(map);
      var bounds=divisionLayer.getBounds();
      map.setMinZoom(0);
      map.fitBounds(bounds,{padding:[16,16],animate:false});
      map.setMinZoom(map.getZoom());
      map.setMaxBounds(bounds);
      map.options.maxBoundsViscosity=1;
      document.getElementById('map').style.visibility='visible';
      emit({type:'division-ready'});
    } else if (command.type === 'draft') {
      if (draft) {map.removeLayer(draft);draft=null;}
      if (valid(command.location)) draft=L.circleMarker([command.location.latitude,command.location.longitude],{radius:10,color:'#fff',weight:3,fillColor:'#f59e0b',fillOpacity:1}).addTo(map);
    } else if (command.type === 'update') {
      markers.clearLayers();
      command.zones.forEach(function(zone) {
        if (!valid({latitude:zone.lat,longitude:zone.lng})) return;
        if (division && !inDivision(zone.lat,zone.lng)) return;
        var color = zone.type === 'medical' ? '#ef4444' : '#059669';
        var icon = L.divIcon({className:'safe-zone-marker',iconSize:[30,38],iconAnchor:[15,38],
          html:'<svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg"><path d="M15 37C12 31 1 22 1 15a14 14 0 1 1 28 0c0 7-11 16-14 22z" fill="'+color+'" stroke="white" stroke-width="2"/><circle cx="15" cy="15" r="5" fill="white"/></svg>'});
        var label = document.createElement('span');
        label.textContent = zone.name;
        L.marker([zone.lat,zone.lng],{icon:icon,title:zone.name,bubblingMouseEvents:false})
          .bindTooltip(label).on('click',function(){emit({type:'select',id:zone.id});}).addTo(markers);
      });
      if (valid(command.location) && (!division || inDivision(command.location.latitude,command.location.longitude))) {
        var position = [command.location.latitude,command.location.longitude];
        if (userMarker) userMarker.setLatLng(position);
        else userMarker = L.circleMarker(position,{radius:8,color:'#fff',weight:3,fillColor:'#2563eb',fillOpacity:1})
          .bindTooltip('Your location').addTo(map);
      } else if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
    } else if (command.type === 'fit') {
      var points = command.points.filter(valid).map(function(point){return [point.latitude,point.longitude];});
      if (points.length) {
        var size = map.getSize();
        map.fitBounds(L.latLngBounds(points),{maxZoom:15,
          paddingTopLeft:[35,Math.min(190,size.y*0.3)],
          paddingBottomRight:[55,Math.min(210,size.y*0.3)],animate:true});
      }
    } else if (command.type === 'locate' && valid(command.location)) {
      if (division && !inDivision(command.location.latitude,command.location.longitude)) {emit({type:'outside'});return;}
      map.setView([command.location.latitude,command.location.longitude],16,{animate:true});
    }
  };
  window.addEventListener('message',function(event){
    if (event.source === window.parent && event.data && event.data.source === 'safe-map-host')
      window.safeMapReceive(event.data.command);
  });
  map.on('click',function(event){
    if (readOnly) {emit({type:'clear'});return;}
    if (division) {
      if (inDivision(event.latlng.lat,event.latlng.lng)) emit({type:'pick',location:{latitude:event.latlng.lat,longitude:event.latlng.lng}});
      else emit({type:'outside'});
    } else emit({type:'clear'});
  });
  window.addEventListener('resize',function(){map.invalidateSize();});
  emit({type:'ready'});
}
</script></body></html>`;
