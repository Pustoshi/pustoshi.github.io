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
 */
function OpenPopup(url)
{
	var popup = document.getElementById("popup");
	var container = popup.children[0];
	popup.classList.add("popup-window-open");
	setTimeout(function()
			   {
				   var xhttp = new XMLHttpRequest();
				   xhttp.onreadystatechange = function()
				   {
					   if (this.readyState == 4 && this.status == 200)
					   {
						   container.classList.add("fadein-frame");
						   container.innerHTML = xhttp.responseText;
					   }
				   };
				   xhttp.open("GET", url);
				   xhttp.send();
			   }, 950);
}

//------------------------------------------
/**
 */
function ClosePopup()
{
	var popup = document.getElementById("popup");
	var container = popup.children[0];
	container.classList.remove("fadein-frame");
	setTimeout(function()
			   {
				   container.removeChild(container.children[0]);
				   popup.classList.remove("popup-window-open");
			   }, 500);
}

//------------------------------------------
/**
*/
function IsElementInViewport (el)
{
    var rect = el.getBoundingClientRect();

    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

//------------------------------------------
/**
*/
function IsElementClippedInViewport (el)
{
    var rect = el.getBoundingClientRect();

    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.left <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

//------------------------------------------
/**
*/
function OnScrollIn(element, callback, divisor)
{
	// a small hack, but since we might rescale this element, we should remember the original position
	if (element.origTop == undefined)
		element.origTop = element.offsetTop;

	// get the viewport bottom value
	var scrollPos = window.pageYOffset + window.innerHeight;
	var elementPos = element.origTop;

	// if the viewport bottom is below the top of the element, start the effect
	if (elementPos < scrollPos)
	{
		// calculate the factor, the divisor will tell how 'fast' the animation should happen
		var factor = (scrollPos - elementPos) / divisor;
		factor = Math.min(Math.max(factor, 0), 1);

		// run the callback and pass the factor
		callback(factor, element);
	}
}

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
	var elementsToFade = document.querySelectorAll('.fade-on-scroll');
	var elementsToScale = document.querySelectorAll('.scale-on-scroll');

	// this function runs whenever we need a new animation frame
	var startTime = Date.now();
	var frameTime = Date.now();
	function Update()
	{
		// loop through our elements that should fade when we scroll
		Array.prototype.forEach.call(elementsToScale,
									 function(element)
									 {
										 OnScrollIn(element,
													function(factor, element)
													{
														element.style.opacity = factor;
														element.style.transform = `scale(${factor}, ${factor})`;
													}, 500);
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
