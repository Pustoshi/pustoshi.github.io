
var context = null;
var vs = null;
var ps = null;
var program = null;

const Uniform =
	  {
		  RESOLUTION: 0,
		  MOUSE: 1,
		  TIME: 2,
		  SHOCK: 3
	  };
var uniforms = [];
var shock = 0.0;
var targetShock = 0.0;

var posX = 0.0;
var posY = 0.0;
var targetPosX = 0.0;
var targetPosY = 0.0;
var pauseGL = false;
//------------------------------------------
/**
 */
function CreateShaderGL(gl, type, source)
{
	var shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (gl.getShaderParameter(shader, gl.COMPILE_STATUS))
	{
		return shader;
	}
	else
	{
		console.error(gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
	}
	return null;
}

//------------------------------------------
/**
 */
function CreateProgram(gl, vs, ps)
{
	var program = gl.createProgram();
	gl.attachShader(program, vs);
	gl.attachShader(program, ps);
	gl.linkProgram(program);
	if (gl.getProgramParameter(program, gl.LINK_STATUS))
	{
		return program;
	}
	else
	{
		console.error(gl.getError());
		gl.deleteProgram(program);
	}
	return null;
}

//------------------------------------------
/**
 */
function SetupGL()
{
	const canvas = document.querySelector("#canvas");
	canvas.height = window.innerHeight;
	canvas.width = document.body.clientWidth;
	const gl = canvas.getContext("webgl2");
	context = gl;

	if (gl === null)
	{
		console.error("Failed to initialize WebGL2");

		// fallback method, replace cool 3D effects with video...
		var body = document.body;
		var video = document.createElement("div");
		video.innerHTML = "<video muted loop autoplay playsinline width=" + canvas.width + " height=" + canvas.height + "><source src='images/Comp 1_5.mp4' type='video/mp4'></video>"
		body.replaceChild(video, canvas);
		return false;
	}

	gl.clearColor(0.086,0.086,0.086,1);
	gl.clear(gl.COLOR_BUFFER_BIT);

	const vs_source = fullscreenVS;
	const ps_source = raymarchPS;

	vs = CreateShaderGL(gl, gl.VERTEX_SHADER, vs_source);
	ps = CreateShaderGL(gl, gl.FRAGMENT_SHADER, ps_source);
	program = CreateProgram(gl, vs, ps);

	if (program)
	{
		uniforms.push(gl.getUniformLocation(program, "Resolution"));
		uniforms.push(gl.getUniformLocation(program, "Mouse"));
		uniforms.push(gl.getUniformLocation(program, "Time"));
		uniforms.push(gl.getUniformLocation(program, "Shock"));
	}

	gl.useProgram(program);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
	gl.uniform2f(uniforms[Uniform.RESOLUTION], canvas.width, canvas.height);
	window.addEventListener(
		"resize",
		function(event)
		{
			canvas.height = window.innerHeight;
			canvas.width = document.body.clientWidth;
			gl.viewport(0, 0, canvas.width, canvas.height);
			gl.uniform2f(uniforms[Uniform.RESOLUTION], canvas.width, canvas.height);
		});

	document.documentElement.addEventListener(
		"mousemove",
		function(event)
		{
			var rect = canvas.getBoundingClientRect();
			rect.x += window.scrollX;
			rect.y += window.scrollY;
			var x = (event.pageX - rect.left);
			var y = rect.bottom - (event.pageY - rect.top);
			targetPosX = x;
			targetPosY = y;
		});
	
	document.documentElement.addEventListener(
		"click",
		function(event)
		{
			var rect = canvas.getBoundingClientRect();
			if (event.pageY < rect.bottom && event.pageY > rect.top)
			{
				targetShock = shock + 0.5;
				targetShock = Math.min(targetShock, 2.5);
			}
		});
	return true;
}

//------------------------------------------
/**
 */
function DrawGL(time, frameTime)
{
	if (!pauseGL)
	{
		var lerp = time / 1000;
		context.uniform1f(uniforms[Uniform.TIME], lerp);

		lerp = Math.max(Math.min(frameTime/150, 1), 0);
		shock = (1.0 - lerp) * shock + lerp * targetShock;
		targetShock -= 0.02;
		targetShock = Math.max(0.0, targetShock);

		posX = (1.0 - lerp) * posX + lerp * targetPosX;
		posY = (1.0 - lerp) * posY + lerp * targetPosY;
		context.uniform2f(uniforms[Uniform.MOUSE], posX, posY);
		context.uniform1f(uniforms[Uniform.SHOCK], shock);
		context.useProgram(program);
		context.drawArrays(context.TRIANGLES, 0, 3);
	}
}

