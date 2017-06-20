/*var nodes = [
	//"192.168.8.200",
	//"192.168.8.201"
	"10.0.0.47",
	"10.0.0.48"
];*/

//var ipBase = "10.0.0.";
var ipBase = "192.168.8.";

var nodes = [];
for (var i = 20; i < 80; i++) {
	nodes[i] = ipBase + i;
}

console.log(nodes);

exports.nodes = function() {
	return nodes;
}