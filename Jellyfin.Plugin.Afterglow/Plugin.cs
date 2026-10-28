using Jellyfin.Plugin.Afterglow.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.Afterglow;

/// <summary>Afterglow: the extras of the Afterglow theme (quality marks, menu, "tonight"…), added to the web client.</summary>
public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    public static Plugin? Instance { get; private set; }

    public override string Name => "Afterglow";

    public override Guid Id => Guid.Parse("d5e09db5-245d-4b8d-a8b5-1e5d48841ba6");

    public override string Description => "The extras of the Afterglow theme: quality marks on posters, and more to come.";

    public IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo
        {
            Name = Name,
            EmbeddedResourcePath = $"{GetType().Namespace}.Configuration.configPage.html",
        };
    }
}
