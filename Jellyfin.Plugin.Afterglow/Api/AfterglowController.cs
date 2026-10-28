using System.Net.Mime;
using Jellyfin.Plugin.Afterglow.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.Afterglow.Api;

/// <summary>Serves the script and stylesheet the plugin adds to the web client, and the settings they follow.</summary>
[ApiController]
[Route("Afterglow")]
[AllowAnonymous]
public class AfterglowController : ControllerBase
{
    private const string ResourcePrefix = "Jellyfin.Plugin.Afterglow.Web.";

    /// <summary>The script itself (public: the page loads it before anybody has signed in).</summary>
    /// <returns>The JavaScript file.</returns>
    [HttpGet("afterglow.js")]
    [Produces("application/javascript")]
    public ActionResult GetScript() => Serve("afterglow.js", "application/javascript");

    /// <summary>The stylesheet of the plugin's own features (the rail, the billboard…).</summary>
    /// <returns>The CSS file.</returns>
    [HttpGet("afterglow.css")]
    [Produces("text/css")]
    public ActionResult GetStyle() => Serve("afterglow.css", "text/css");

    /// <summary>The switches from the settings page.</summary>
    /// <returns>The settings the script follows.</returns>
    [HttpGet("config")]
    [Produces(MediaTypeNames.Application.Json)]
    public ActionResult GetConfig()
    {
        var config = Plugin.Instance?.Configuration;
        Response.Headers.CacheControl = "no-store";
        return Ok(new
        {
            qualityMarks = config?.QualityMarks ?? true,
            sideMenu = config?.SideMenu ?? true,
            hero = config?.Hero ?? true,
            topTen = config?.TopTen ?? true,
            tonight = config?.Tonight ?? true,
            topTenPosition = ConfigChoices.TopTenPosition(config?.TopTenPosition),
            qualityCorner = ConfigChoices.QualityCorner(config?.QualityCorner),
        });
    }

    private ActionResult Serve(string name, string contentType)
    {
        // For developing the plugin: a file of the same name in <plugin data folder>/dev wins over the one inside the DLL,
        // so a change can be tried by copying a file, without a new build and a restart of Jellyfin.
        string? dataFolder = Plugin.Instance?.DataFolderPath;
        if (dataFolder is not null)
        {
            string devFile = Path.Combine(dataFolder, "dev", name);
            if (System.IO.File.Exists(devFile))
            {
                Response.Headers.CacheControl = "no-store";
                return PhysicalFile(devFile, contentType);
            }
        }

        Stream? stream = typeof(Plugin).Assembly.GetManifestResourceStream(ResourcePrefix + name);
        if (stream is null)
        {
            return NotFound();
        }

        // The address carries the version (?v=), so the browser may keep it for a while.
        Response.Headers.CacheControl = "public, max-age=3600";
        return File(stream, contentType);
    }
}
