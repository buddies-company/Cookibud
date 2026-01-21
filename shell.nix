{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    # Python environment
    pkgs.python311
    pkgs.python311Packages.virtualenv
    pkgs.python311Packages.pip

    # React/Node environment
    pkgs.nodejs_20
    pkgs.nodePackages.npm
  ];

  shellHook = ''
    # This runs when you enter the shell
    echo "Nix-shell activated: Python and Node are ready!"
  '';
}