using System.Reflection;
using System.Runtime.Loader;
using System.Text.Json;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.Afterglow.Injection;

/// <summary>
/// At start-up, asks the File Transformation plugin to run <see cref="IndexTransformer.Inject"/> on index.html.
/// Done with reflection, because File Transformation cannot be referenced directly (it lives in its own load context).
/// </summary>
public sealed class StartupRegistrar : IHostedService
{
    /// <summary>
    /// Which file to patch. Exactly the text the other plugins use (Media Bar, SeerrFin): File Transformation keeps one
    /// pipeline per pattern text, and a different spelling of the same file would sit in a pipeline that never runs.
    /// </summary>
    public const string FileNamePattern = "index.html";

    private static readonly Guid TransformationId = Guid.Parse("7b1f2c0e-4a53-4a7e-9d0e-3f6a5f7a1c11");

    // File Transformation may load after us: try for a while before giving up.
    private const int Attempts = 30;
    private static readonly TimeSpan Pause = TimeSpan.FromSeconds(2);

    private readonly ILogger<StartupRegistrar> _logger;

    public StartupRegistrar(ILogger<StartupRegistrar> logger)
    {
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _ = Task.Run(() => RegisterWhenReadyAsync(cancellationToken), cancellationToken);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task RegisterWhenReadyAsync(CancellationToken cancellationToken)
    {
        for (int attempt = 1; attempt <= Attempts && !cancellationToken.IsCancellationRequested; attempt++)
        {
            if (TryRegister())
            {
                _logger.LogInformation("Afterglow: script registered with File Transformation");
                return;
            }

            await Task.Delay(Pause, cancellationToken).ConfigureAwait(false);
        }

        _logger.LogWarning("Afterglow: the File Transformation plugin was not found, so the script is not added. Install it from the plugin catalogue and restart.");
    }

    private bool TryRegister()
    {
        try
        {
            Assembly? assembly = AssemblyLoadContext.All
                .SelectMany(context => context.Assemblies)
                .FirstOrDefault(a => a.FullName?.Contains(".FileTransformation", StringComparison.Ordinal) == true);
            MethodInfo? register = assembly?.GetType("Jellyfin.Plugin.FileTransformation.PluginInterface")?.GetMethod("RegisterTransformation");
            Type? payloadType = register?.GetParameters().FirstOrDefault()?.ParameterType;
            if (register is null || payloadType is null)
            {
                return false;
            }

            // The payload is a Newtonsoft JObject: built from JSON with the type's own Parse, so no reference to it is needed.
            string json = JsonSerializer.Serialize(new Dictionary<string, object?>
            {
                ["id"] = TransformationId,
                ["fileNamePattern"] = FileNamePattern,
                ["callbackAssembly"] = typeof(IndexTransformer).Assembly.FullName,
                ["callbackClass"] = typeof(IndexTransformer).FullName,
                ["callbackMethod"] = nameof(IndexTransformer.Inject),
            });
            object? payload = payloadType.GetMethod("Parse", new[] { typeof(string) })?.Invoke(null, new object[] { json });
            register.Invoke(null, new[] { payload });
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Afterglow: registration attempt failed");
            return false;
        }
    }
}
