var key = '974a5ebc077564f72bd639d122479d4b';


var form = d3.select('form');
var title = d3.select('h1');

form
	.on('submit', function(){
		d3.event.preventDefault();
		form.style('display', 'none');

		var user = form.select('input')[0][0].value;
		start(user);
	});



var width = 960,
    height = 600;

var color = d3.scale.category20();

var force = d3.layout.force()
    .charge(-50)
    .linkDistance(30)
    .size([width, height]);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

var nodes = [];
var links = [];


var link = svg.selectAll(".link").data(links);
var node = svg.selectAll(".node").data(nodes);

force.on("tick", function() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
});

force
  .nodes(nodes)
  .links(links);

// create elements, kick off things
function update(){

  var most = d3.max(links.map(function(d){return d.count}));

  var link_color = d3.scale.linear()
    .domain([0, most])
    .range(["#aaa", "#blue"]);

  link = svg.selectAll(".link").data(links)
    .enter().append("line")
      .attr("class", "link")
      .style("stroke-width", function(d) { return Math.sqrt(d.count); })
      // .style("stroke", '#000')
      .style("stroke", function(d){
      	return link_color(d.count);
      });

  node = svg.selectAll(".node").data(nodes)
    .enter().append("circle")
      .attr("class", "node")
      .attr("r", 6)
      .style("fill", function(d) { return color(d.artist); })
      .call(force.drag)
      .on('mouseover', function(d) {
      	title.text(d.title);
      });


  force.start();
}

var artists = [];

function getNode(track){
	var matches = nodes.filter(function(node) {
		return node.mbid == track.mbid;
	});
	if(matches[0]){
		return matches[0];
	} else {
		var i = artists.indexOf(track.artist);
		if(i == -1){
			artists.push(track.artist);
			i = artists.length - 1;
		}
		var n = {mbid: track.mbid, artist: i, count:0, title: track.name + ' - ' + track.artist};
		nodes.push(n);
		return n;
	}
}

function getLink(_source, _target){
	var source = getNode(_source);
	var target = getNode(_target);

	var matches = links.filter(function(link) {
		return link.source === source && link.target === target;
	});

	if(matches[0]){
		return matches[0];
	} else {
		var link = {source: source, target: target, count:0};
		links.push(link);
		return link;
	}
}

// request a page and update the vis
function request(user, page, cb){

	d = requestData(key, user, page);
	lastFM(d, function(err, doc){


		extractTracks(doc)
			// .map(simplify)
			.reduce(function(prior, track){
				
				if((!track || !track.mbid)|| (!prior || !prior.mbid)){
					return track;
				}

				if(!track || (prior.mbid === track.mbid)){
					return track; // repeats: a whole different story
				}

				var link = getLink(prior, track);
				link.count++;
				link.target.count++;

				return track;

			});
		cb();
	});

}


function start(username){
	// I can't be bothered making this work properly
	var left = 3;
	function cb(){
		if(!left--) {
			update();
		}
	}

	request(username, 0, cb);
	request(username, 1, cb);
	request(username, 2, cb);
	request(username, 2, cb);

}

// we don't care about all the data
function simplify(track){
	return {
		mbid: track.mbid
	};
}


// Stuff from lastfm-to-csv

// make a request to lastFM
function lastFM(data, callback){
  return reqwest({
    url:"https://ws.audioscrobbler.com/2.0/",
    data: data,
    type: 'xml',
    success: function(data){
      if(callback){callback(false, data)}
    },
    error: function(err){
      if(callback){callback(err)}
    }
  })
}

// generate data for a request
function requestData(api_key, user, page){
  return {
    method:'user.getrecenttracks',
    user:user,
    api_key:api_key,
    limit:200,
    page: page || 1
  }
}

function extractTracks(doc){

  // probably nicer ways to do this
  var arr = [];
  var track, obj, child;
  var tracks = doc.evaluate('lfm/recenttracks/track', doc, null, XPathResult.ANY_TYPE, null)
  while (track = tracks.iterateNext()){
    obj = {};
    for (var i = track.childNodes.length - 1; i >= 0; i--) {
      child = track.childNodes[i];
      obj[child.tagName] = child.textContent;
    };
    arr.push(obj)
  }

  return arr;
}


function extractPageCount(doc){
  var recenttracks = doc.evaluate('lfm/recenttracks', doc, null, XPathResult.ANY_TYPE, null).iterateNext()
  return parseInt(recenttracks.getAttribute('totalPages'), 10)
}

// pull out a row of keys
function row(keys, obj){
  return keys.map(function(k){
    return obj[k]
  })
}





// kick off with a url if you want
if(location.search){
	form.style('display','none');
	start(location.search.substr(1));
}
