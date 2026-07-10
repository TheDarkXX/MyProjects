import sys
import os

# Add utils to path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "utils"))
try:
    from registry import set_active_project, get_active_project, load_registry
except ImportError:
    print("❌ Error: Could not import utils/registry.py")
    sys.exit(1)

def main():
    if len(sys.argv) < 2:
        current = get_active_project()
        print("Usage: python switch_project.py <capcut_project_name>")
        if current:
            print(f"Current active project: {current}")
        else:
            print("No active project currently set.")
        sys.exit(1)
        
    project_name = sys.argv[1]
    
    # Check if project exists in registry, if not we can optionally set channel/notes
    reg = load_registry()
    is_new = project_name not in reg.get("projects", {})
    
    set_active_project(project_name)
    
    print(f"✅ Successfully switched active project to: {project_name}")
    if is_new:
        print(f"   (New project automatically registered in VVE Registry)")
        
    print(f"\n💡 You can now run VVE scripts without specifying the project name.")
    print(f"   Example: python scripts/04b-apply-editorial-cuts.py")

if __name__ == "__main__":
    # Force UTF-8 output
    if sys.stdout.encoding.lower() != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')
    main()
