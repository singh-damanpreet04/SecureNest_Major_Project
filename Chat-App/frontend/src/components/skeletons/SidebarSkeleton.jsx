import {Users} from "lucide-react";

const SidebarSkeleton = () => {
    const skeletonContacts = Array(8).fill(null);
    return(
        <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transitioon-all duration-200">
            {/*Header */}
            <div className="border-b border-base-300 w-full p-5">
                <div className="flex items-center gap-2">
                    <Users className="w-6 h-6"/>
                    <span className="font-medium hidden lg:block">Contacts</span>
                </div>
            </div>

            {/*Skeleton Contacts */}
            <div className="overflow-y-auto w-full py-3">
                {skeletonContacts.map((_,idx) => (
                    <div key={idx} className="w-full p-3 flex items-center gap-3">
                        {/*Skeleton Avatar */}
                        <div className="relative mx-auto lg:mx-0">
                            <div className="skeleton rounded-full w-12 h-12"> 
                            </div>
                        </div>

                        {/*User Info Skeleton - only visible onlarger screens */}
                        <div className="hidden lg:block text-left min-w-0 flex-1">
                            <div className="skeleton w-20 h-4 rounded bg-base-300 animate-pulse"></div>
                            <div className=" skeleton w-16 h-4 rounded bg-base-300 animate-pulse mt-1"></div>
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
};

export default SidebarSkeleton;