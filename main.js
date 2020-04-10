//------------------------------------------
/**
   Main entry point for JavaScript front-end

   (C) 2020 Gustav Sterbrant & Dina Zhumasheva
*/
//------------------------------------------

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

					var reactToScrollElements = container.querySelectorAll(".react-on-scroll");
					Array.prototype.forEach.call(
						reactToScrollElements,
						function(element)
						{
							// bind the scrolling window, which is the popup container, and add
							// all the reaction classes automatically
							element.scrollWindow = container;
						});

					// find all subpage elements with the class block-big
					var blockBigElements = container.querySelectorAll('.block-big');
					Array.prototype.forEach.call(
						blockBigElements,
						function(element)
						{
							// bind the scrolling window, which is the popup container, and add
							// all the reaction classes automatically
							element.scrollWindow = container;
							element.classList.add("react-on-scroll", "fade-on-scroll", "scale-on-scroll");
						});


					// update elements to notify list
					elementsToNotifyScroll = document.querySelectorAll('.react-on-scroll');
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
				   pauseGL = false;
			   }, 500);
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

						   // find all subpage elements with the class block-big
						   var subpageElements = container.querySelectorAll('.block-big');
						   Array.prototype.forEach.call(
							   subpageElements,
							   function(element)
							   {
								   // bind the scrolling window, which is the popup container, and add
								   // all the reaction classes automatically
								   element.scrollWindow = container;
								   element.classList.add("react-on-scroll", "fade-on-scroll", "scale-on-scroll");
							   });

						   // update elements to notify list
						   elementsToNotifyScroll = document.querySelectorAll('.react-on-scroll');
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
	var elementPos = element.offsetTop;

	// if the viewport bottom is below the top of the element, start the effect
	if (elementPos < scrollPos)
	{
		// calculate the factor, the divisor will tell how 'fast' the animation should happen
		let style = getComputedStyle(element);
		var factor = (scrollPos - elementPos) / (element.offsetHeight * style.getPropertyValue("--scroll-multiplier"));
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
