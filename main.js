//------------------------------------------
/**
   Main entry point for JavaScript front-end

   (C) 2020 Gustav Sterbrant & Dina Zhumasheva
*/
//------------------------------------------


const CursorModes =
	  {
		  POINTER: 0,
		  CROSS: 1
	  }


//------------------------------------------
/**
*/
function ApplyGradient(event)
{
	event.classList.add("gradient");
}

//------------------------------------------
/**
*/
function RemoveGradient(event)
{
	event.classList.remove("gradient");
}


//------------------------------------------
/**
 */
function SetupScrollReactElements(container)
{
	reactToScrollElements = container.querySelectorAll(".react-on-scroll");
	Array.prototype.forEach.call(
		reactToScrollElements,
		function(element)
		{
			// bind the scrolling window, which is the popup container, and add
			// all the reaction classes automatically
			element.scrollWindow = container;
		});

	// find all subpage elements with the class block-big
	blockBigElements = container.querySelectorAll('.block-big');
	Array.prototype.forEach.call(
		blockBigElements,
		function(element)
		{
			// bind the scrolling window, which is the popup container, and add
			// all the reaction classes automatically
			element.scrollWindow = container;
			element.classList.add("react-on-scroll", "fade-on-scroll", "scale-on-scroll");
		});
	elementsToNotifyScroll = document.querySelectorAll('.react-on-scroll');
}

//------------------------------------------
/**
   Open the full-page popup
 */
function OpenPopup(url)
{
	var popup = document.getElementById("popup");
	var container = popup.children[0];
	popup.classList.add("popup-window-open");
	setTimeout(
		function()
		{
			var xhttp = new XMLHttpRequest();
			xhttp.onreadystatechange = function()
			{
				if (this.readyState == 4 && this.status == 200)
				{
					container.classList.add("fadein-frame");
					container.innerHTML = xhttp.responseText;
					pauseGL = true;

					ChangeCursor(CursorModes.CROSS);

					SetupScrollReactElements(container);
				}
			};
			xhttp.open("GET", url + "?" + cacheVersionString);
			xhttp.send();
		}, 950);
}

//------------------------------------------
/**
   Close full-page popup
 */
function ClosePopup()
{
	// check if the elements implements click, in which case, don't close the popup
	if (window.event.target.onclick != null)
	{
		return;
	}
	var popup = document.getElementById("popup");
	var container = popup.children[0];
	container.classList.remove("fadein-frame");
	setTimeout(function()
			   {
				   container.scrollTop = 0;
				   container.removeChild(container.children[0]);
				   popup.classList.remove("popup-window-open");
				   ChangeCursor(CursorModes.POINTER);
				   pauseGL = false;
			   }, 500);
}

//------------------------------------------
/**
 */
function ChangeCursor(mode)
{
	var doc = document.getElementById("mouse");
	switch (mode)
	{
		case CursorModes.POINTER:
		doc.innerHTML = "&#x27A4";
		doc.style.transform = "translateX(-50%) translateY(-50%) rotateZ(-110deg)";
		break;
		
		case CursorModes.CROSS:
		doc.innerHTML = "&#x2715";
		doc.style.transform = "translateX(-50%) translateY(-50%)";
		break;
	}
}

//------------------------------------------
/**
   Avoids closing the popup and instead just fades out, loads new content, and fades in again
 */
function ReopenPopup(newUrl)
{
	var popup = document.getElementById("popup");
	var container = popup.children[0];
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function()
	{
		if (this.readyState == 4 && this.status == 200)
		{
			container.classList.remove("fadein-frame");
			setTimeout(function()
					   {
						   container.scrollTop = 0;
						   container.classList.add("fadein-frame");
						   container.innerHTML = xhttp.responseText;

						   SetupScrollReactElements(container);
					   }, 500);
		}
	};
	xhttp.open("GET", newUrl + "?" + cacheVersionString);
	xhttp.send();
}

//------------------------------------------
/**
*/
function OnScrollIn(element, callback)
{
	// get the viewport bottom value
	var scrollPos = element.scrollWindow.scrollTop + element.scrollWindow.clientHeight;
	
	let style = getComputedStyle(element);
	var elementPos = element.offsetTop;
	var elementHeight = element.offsetHeight;

	// if element is absolute positioned, find the relative parent
	if (style.position == "absolute")
	{
		var parent = element.parentNode;
		while (parent != null)
		{
			let parentStyle = getComputedStyle(parent);
			elementPos += parent.offsetTop;
			if (parentStyle.position != "absolute")
				break;
			parent = parent.parentNode;
		}
	}
	
	if (elementPos < scrollPos)
	{
		// calculate the factor, the divisor will tell how 'fast' the animation should happen
		var factor = (scrollPos - elementPos) / (elementHeight * style.getPropertyValue("--scroll-multiplier"));
		factor = Math.min(Math.max(factor, 0), 1);

		// run the callback and pass the factor
		callback(factor, element);
	}
}

var elementsToNotifyScroll = [];
//------------------------------------------
/**
*/
window.onload = function()
{
	var hasGL = SetupGL();

	var update = window.requestAnimationFrame || function(callback)
	{
		window.setTimeout(callback, 1000/60);
	};
	elementsToNotifyScroll = document.querySelectorAll('.react-on-scroll');
	Array.prototype.forEach.call(
		elementsToNotifyScroll,
		function(element)
		{
			element.scrollWindow = document.documentElement;
		});
	// connect to websocket
	/*
	const socket = new WebSocket("ws://www.pustoshi.com:8080/fetch");
	socket.addEventListener(
		"open",
		function(ev)
		{
		});
	socket.addEventListener(
		"close",
		function(ev)
		{
			console.log("Connection closed: " + ev.reason);
			socket.close();
		});
	*/

	var mouseElement = document.getElementById("mouse");
	document.documentElement.addEventListener(
		"mousemove",
		function(ev)
		{
			mouseElement.style.left = ev.clientX + 'px';
			mouseElement.style.top = ev.clientY + 'px';
		});
	
	// this function runs whenever we need a new animation frame
	var startTime = Date.now();
	var frameTime = Date.now();
	function Update()
	{
		// loop through our elements that should fade when we scroll
		Array.prototype.forEach.call(
			elementsToNotifyScroll,
			function(element)
			{
				OnScrollIn(
					element,
					function(factor, element)
					{
						element.style.setProperty("--scroll-factor", factor);
					});
			}
		);

		if (hasGL)
		{
			var frameElapsedTime = Date.now() - frameTime;
			frameTime = Date.now();
			var elapsedTime = Date.now() - startTime;


			// if elapsed time is too big, reset startTime to avoid precision issues
			if (elapsedTime > 1000000)
				startTime = Date.now();

			DrawGL(elapsedTime, frameElapsedTime);
		}
		update(Update);
	}

	Update();
}
