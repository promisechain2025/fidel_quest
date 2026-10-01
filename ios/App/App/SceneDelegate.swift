import UIKit
import Capacitor

/// UIScene lifecycle adoption (iOS/iPadOS 27 SDK requirement, Apple TN3187).
///
/// The window and root view controller (NoZoomBridgeViewController) still come
/// from Main.storyboard via UISceneStoryboardFile, so UIKit creates and shows
/// `window` before scene(_:willConnectTo:options:) runs; no manual UIWindow setup.
///
/// Capacitor 7 has no SceneDelegateProxy (added in 8.5), so URL opens and
/// universal links are forwarded to the existing ApplicationDelegateProxy,
/// which posts the same .capacitorOpenURL / .capacitorOpenUniversalLink
/// notifications the App plugin listens to.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard scene is UIWindowScene else { return }
        // Cold-start deep links / universal links arrive here instead of the AppDelegate.
        if let url = connectionOptions.urlContexts.first?.url {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
        }
        if let activity = connectionOptions.userActivities.first {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
}
