let fullscreenVS = `#version 300 es
out vec2 UV;
void main()
		{
			float x = -1.0f + float((gl_VertexID & 1) << 2);
			float y = -1.0f + float((gl_VertexID & 2) << 1);
			UV.x = (x + 1.0f) * 0.5f;
			UV.y = (y + 1.0f) * 0.5f;
			gl_Position = vec4(x, y, 0, 1);
		}	
`;

let raymarchPS = `#version 300 es

//	Credit to CaliCoastReplay (https://www.shadertoy.com/view/ltscW8) for the marching and lighting setup.

precision highp float;
uniform vec2 Mouse;
uniform vec2 Resolution;
uniform float Time;
uniform float Shock;

float distance_from_sphere(in vec3 world_point, in vec3 sphere_center, float radius)
{
    return length(world_point - sphere_center) - radius;
}


//Polynomial smooth minimum by Inigo Quilez.
//Used in this case to "join" the two viroids into a metaball - a normal minimum would return
//unjoined surface data.
float smin( float a, float b, float k )
{
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);
}

#define TAN_HALF_FOVY 0.5773502691896257
#define CAM_Z_NEAR 0.1
#define CAM_Z_FAR 5.0

mat4 getClipToWorld(vec2 resolution, vec3 nvCamFw, vec3 nvCamFixedUp) {
    float ratio = resolution.x / resolution.y;
    mat4 clipToEye = mat4(
        ratio * TAN_HALF_FOVY, 0.0, 0.0, 0.0,
        0.0, TAN_HALF_FOVY, 0.0, 0.0,
        0.0, 0.0,  0.0, (CAM_Z_NEAR - CAM_Z_FAR) / (2.0 * CAM_Z_NEAR * CAM_Z_FAR),
        0.0, 0.0, -1.0, (CAM_Z_NEAR + CAM_Z_FAR) / (2.0 * CAM_Z_NEAR * CAM_Z_FAR)
    );

    vec3 nvCamRt = normalize(cross(nvCamFixedUp, nvCamFw));
    vec3 nvCamUp = cross(nvCamFw, nvCamRt);
    mat4 eyeToWorld = mat4(
         nvCamRt, 0.0,
         nvCamUp, 0.0,
        -nvCamFw, 0.0,
        0.0, 0.0, 0.0, 1.0
    );

    return eyeToWorld * clipToEye;
}

#define PI_OVER_2 1.570796326794896
vec3 sceneCamera()
{
    vec3 camera_position = vec3( 0, 0, 7 );
    vec3 camTarget = vec3(0.0);
    vec3 nvCamFw = normalize(camTarget - camera_position);

    vec2 uv = Mouse.xy / Resolution.xy;
    vec4 clip = vec4(uv * 2.0 - 1.0, 1.0, 1.0);

    vec3 nvCamFixedUp = vec3(0.0, 1.0, 0.0);
    vec4 world = getClipToWorld(Resolution.xy, normalize(camera_position), nvCamFixedUp) * clip;
	return world.xyz / world.w;
}


//Distance to the closest world object from a given point p along the raymarcher.
//Used in this example to "map the world" - see above.
float distance_to_closest_object(in vec3 p)
{
    vec3 mouseCamPos;
    mouseCamPos = sceneCamera();
    float sphere_0 = distance_from_sphere(p, vec3(mouseCamPos.xy, 0.5), 2.0f);
    float sphere_1= distance_from_sphere(p, vec3(cos(-1.0 * Time), cos(1.5 + Time), sin(0.5 * Time)), 2.0);

    float displacement0 = sin(-2.0f  * p.x + Time) * cos(2.0f *  p.y + Time) * sin(2.0 * p.z + Time) * 0.25;
    float displacement1 = cos(2.0f *   p.x + Time) * cos(2.0f *  p.y + Time) * cos(2.0 * p.z + Time) * 0.25;

    return smin(sphere_0 + displacement0 * (1.0f + Shock), sphere_1 + displacement1, 1.2f);
   // return smin(sphere_0, sphere_1, .7);  //switch with this for simple spheres instead
}

//Estimates the normal vector (the vector perpendicular to the surface) at any given world point
//representing a surface.  Should only be used at world points representing collisions.  Samples
//the world at six more points bounding the world point along the three primary world axes (x, y,
//and z) and then uses that data to estimate the normal there.
vec3 calculate_normal(in vec3 world_point)
{
    const vec3 small_step = vec3(0.0025, 0.0, 0.0);

    float gradient_x = distance_to_closest_object(world_point + small_step.xyy)
        - distance_to_closest_object(world_point - small_step.xyy);
    float gradient_y = distance_to_closest_object(world_point + small_step.yxy)
        - distance_to_closest_object(world_point - small_step.yxy);
    float gradient_z = distance_to_closest_object(world_point + small_step.yyx)
        - distance_to_closest_object(world_point - small_step.yyx);

    vec3 normal = vec3(gradient_x, gradient_y, gradient_z);

    return normalize(normal);
}

//The actual raymarcher.  "Marches" a ray along a direction vector, starting at an eye/camera
//point, by adding that direction vector to the origin, and repeating that until it either
//hits something, travels a certain number of steps, or reaches a maximum distance.  If it hits
//a surface, it calculates the surface normal at that point, and uses that normal to calculate
//the lighting according to a modified Phong shading model.
vec4 ray_march(in vec3 ray_origin, in vec3 ray_direction, in float screen_fade)
{
    float total_distance_traveled = 0.0;
    const int NUMBER_OF_STEPS = 64;
    const float MINIMUM_HIT_DISTANCE = 0.001;
    const float MAXIMUM_TRACE_DISTANCE = 1000.0;

    for (int i = 0; i < NUMBER_OF_STEPS; ++i)
    {
        vec3 current_position = ray_origin + total_distance_traveled * ray_direction;
		float distance_to_closest = distance_to_closest_object(current_position);
        if (distance_to_closest < MINIMUM_HIT_DISTANCE)
        {
            vec3 normal = calculate_normal(current_position);

            vec3 light_positions[3];
            light_positions[0] = vec3(1.0+sin(Time)*5.0, -3.0+3.0*cos(Time/3.0), 4.0 + 1.0 *sin(Time/5.0));
            light_positions[1] = vec3(1.0-sin(Time/2.0)*2.0, -1.0-cos(Time/2.0), 7.0 + 1.0 -sin(Time/4.0));
            light_positions[2] = vec3(2.0-sin(Time/2.0)*2.0, -5.0-sin(Time/4.0), 2.0 + 1.0 -sin(Time/1.0));
            vec3 light_intensities[3];
            light_intensities[0] = vec3(0.4, 0.4, 0.4);
            light_intensities[1] = vec3(0.04, 0.9, 0.2);
            light_intensities[2] = vec3(0.1, 0.2, 0.8);
            vec3 direction_to_view = normalize(current_position - ray_origin);float fresnel_base = 1.0 + dot(direction_to_view, normal);
            float fresnel_intensity = 0.04*pow(fresnel_base, 2.0);
            float fresnel_shadowing = pow(fresnel_base, 8.0);
            float fresnel_supershadowing = pow(fresnel_base, 40.0);
            float fresnel_antialiasing = 4.0*pow(fresnel_base, 8.0);
            float attenuation =  pow(total_distance_traveled,2.0)/150.0;

            vec3 col = vec3(0.0);

            for (int j = 0; j < 3; j++)
            {
                vec3 direction_to_light = normalize(current_position - light_positions[j]);
                vec3 light_reflection_unit_vector =
                	 reflect(direction_to_light ,normal);

                float diffuse_intensity = 0.6*pow(max(0.0, dot(normal, direction_to_light)),5.0);
                float ambient_intensity = 0.2;
                float specular_intensity =
                    1.15* pow(clamp(dot(direction_to_view, light_reflection_unit_vector), 0.0,1.0), 90.0);
                float backlight_specular_intensity =
                    0.01* pow(clamp(dot(direction_to_light, light_reflection_unit_vector),0.0,1.0), 3.0);

				vec3 material_diffuse = vec3(sin(0.4 * Time), sin(0.8 * Time), cos(0.15 * Time));
				vec3 material_ambient = vec3(sin(0.1 * Time), cos(0.25 * Time), sin(0.7 * Time));
				vec3 material_specular = vec3(cos(0.5f * Time), cos(1.0f * Time), sin(0.25f * Time));
            	vec3 colFromLight = vec3(0.0);
                colFromLight += min(material_diffuse, vec3(0.8, 0.5, 0.5)) * diffuse_intensity;
                colFromLight += min(max(material_ambient, vec3(0.1, 0.1, 0.1)), vec3(0.8, 0.5, 0.5)) * ambient_intensity;
                colFromLight += min(max(material_specular, vec3(0.1, 0.1, 0.1)), vec3(0.8, 0.5, 0.5)) * specular_intensity;
                colFromLight += vec3(0.5, 0.5, 0.5) * backlight_specular_intensity;
                colFromLight += vec3(0.5, 0.5, 0.2) * fresnel_intensity;
                colFromLight -= vec3(0.0, 1.0, 1.0) * fresnel_shadowing ;
                colFromLight -= vec3(0.0, 1.0, 1.0) * fresnel_supershadowing ;
                //colFromLight -= (min(max(attenuation, 0.0f), 1.0f)) * 0.25f;
               //	colFromLight *= 1.6;
               // colFromLight *= sqrt(light_intensities[j]);
                col += colFromLight;
            }
            return vec4(col, min(1.0-fresnel_antialiasing, screen_fade));
        }

        if (total_distance_traveled > MAXIMUM_TRACE_DISTANCE)
        {
            break;
        }
        total_distance_traveled += distance_to_closest;
    }
    return vec4(0.0);
}

//The final image shader, taking in the screen coordinate and outputting color.
//Uses an eye (camera) position as the ray origin, then uses a look-at point
//and a camera projection matrix to find the ray direction corresponding to the
//screen coordinate.  Passes that ro/rd to the raymarcher to get the color at that point.
in vec2 UV;
out vec4 Color;
void main()
{
    vec2 uv = (-Resolution.xy + 2.0f * gl_FragCoord.xy) / Resolution.y;
	float screen = (UV.y ) * 5.5f;
	screen = min(max(screen * screen, 0.0f), 1.0f);

     // camera movement
	float time_factor = 0.5*Time;
	vec3 camera_position = vec3( 0, 0, 7);
    vec3 ray_origin = camera_position;
    vec3 look_at = vec3( 0.0, 0, 0.0 );
    // camera matrix
    vec3 ww = normalize( look_at - ray_origin );
    vec3 uu = normalize( cross(ww,vec3(0.0,1.0,0.0) ) );
    vec3 vv = normalize( cross(uu,ww));
	// create view ray
	vec3 ray_direction = normalize( uv.x*uu + uv.y*vv + 1.5*ww );

	//float length = sqrt(screen.x * screen.x + screen.y * screen.y);
    vec4 shaded_color = ray_march(ray_origin, ray_direction, screen);

    Color = vec4(shaded_color);
	//Color.xy = screen;
}
`;